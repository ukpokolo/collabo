<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
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

        $this->configureRateLimiting();
    }

    /**
     * For guests Laravel keys the default throttle on domain + IP only, so a
     * shared limit would let one signup sequence lock the user out of the
     * others. Each concern gets its own budget and key.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('auth-login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('auth-register', fn (Request $request) => Limit::perMinute(5)
            ->by($request->ip()));

        RateLimiter::for('auth-verify', fn (Request $request) => Limit::perMinute(10)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('auth-send-code', fn (Request $request) => Limit::perMinute(3)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));
    }
}
