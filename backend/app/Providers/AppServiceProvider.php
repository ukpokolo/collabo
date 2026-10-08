<?php

namespace App\Providers;

use App\Domain\Users\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Windows names this variable "SystemRoot" but Laravel's passthrough
        // list spells it "SYSTEMROOT", and in_array() is case-sensitive.
        // Without this, `php artisan serve` strips it from the server
        // subprocess, Winsock fails to initialise, and every port bind fails.
        if (PHP_OS_FAMILY === 'Windows') {
            ServeCommand::$passthroughVariables[] = 'SystemRoot';
        }

        // personal_access_tokens.tokenable_type holds 'App\Models\User' for every
        // token issued before User moved to Domain/Users. Pinning that string
        // keeps existing logins valid and stops the stored value from changing
        // with future namespace moves.
        Relation::morphMap(['App\\Models\\User' => User::class]);

        if ($proxies = config('app.trusted_proxies')) {
            TrustProxies::at($proxies);
        }

        $this->configureRateLimiting();
    }

    /**
     * For guests Laravel keys the default throttle on domain + IP only, so a
     * shared limit would let one signup sequence lock the user out of the
     * others. Each concern gets its own budget and key.
     */
    protected function configureRateLimiting(): void
    {
        // Adding members by email reveals whether an address is registered, so
        // cap how fast one owner can probe.
        RateLimiter::for('board-members', fn (Request $request) => Limit::perMinute(20)
            ->by((string) $request->user()?->id));

        // Every limit below pairs an IP-keyed bucket with one keyed on the address
        // alone. With forwarded headers trusted a client can invent its IP, so the
        // address-only bucket is what actually bounds guessing and mail volume. The
        // cost is that someone can burn a victim's bucket and briefly block them;
        // these windows are short for that reason.
        $address = fn (Request $request) => strtolower((string) $request->input('email'));

        RateLimiter::for('auth-login', fn (Request $request) => [
            Limit::perMinute(5)->by($address($request).'|'.$request->ip()),
            Limit::perMinutes(15, 20)->by('login-address|'.$address($request)),
        ]);

        // Per IP, and per address: the response is the same for new and existing
        // accounts, so without the second limit this could be used to mail one
        // person repeatedly.
        RateLimiter::for('auth-register', fn (Request $request) => [
            Limit::perMinute(5)->by($request->ip()),
            Limit::perHour(5)->by('register-address|'.$address($request)),
        ]);

        // Each code allows 5 tries, so unlimited new codes would allow unlimited
        // guesses at a 6-digit number; the address-only buckets close that.
        RateLimiter::for('auth-verify', fn (Request $request) => [
            Limit::perMinute(10)->by($address($request).'|'.$request->ip()),
            Limit::perMinutes(15, 30)->by('verify-address|'.$address($request)),
        ]);

        RateLimiter::for('auth-send-code', fn (Request $request) => [
            Limit::perMinute(3)->by($address($request).'|'.$request->ip()),
            Limit::perHour(10)->by('code-address|'.$address($request)),
        ]);
    }
}
