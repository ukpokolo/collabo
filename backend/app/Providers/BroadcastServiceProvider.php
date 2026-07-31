<?php

namespace App\Providers;

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class BroadcastServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // auth:sanctum, NOT 'web'. The frontend lives on a different origin and
        // authenticates with a Bearer token, so there is no session cookie on
        // this request — Echo sends the Authorization header instead.
        Broadcast::routes(['middleware' => ['auth:sanctum']]);

        require base_path('routes/channels.php');
    }
}
