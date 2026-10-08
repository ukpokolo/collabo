<?php

namespace App\Providers;

use App\Domain\Users\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Console\ServeCommand;
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

        RateLimiter::for('auth-login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        // Per IP, and per address: the response is the same for new and existing
        // accounts, so without the second limit this could be used to mail one
        // person repeatedly.
        RateLimiter::for('auth-register', fn (Request $request) => [
            Limit::perMinute(5)->by($request->ip()),
            Limit::perHour(5)->by('email|'.strtolower((string) $request->input('email'))),
        ]);

        RateLimiter::for('auth-verify', fn (Request $request) => Limit::perMinute(10)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('auth-send-code', fn (Request $request) => Limit::perMinute(3)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));
    }
}
