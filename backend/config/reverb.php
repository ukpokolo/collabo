<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Reverb Server
    |--------------------------------------------------------------------------
    |
    | This option defines the default Reverb server that will be used to
    | handle incoming WebSocket connections. You may change this to a
    | different server type if you would like to use another driver.
    |
    */

    'default' => env('REVERB_SERVER', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Reverb Servers
    |--------------------------------------------------------------------------
    |
    | Here you may define the Reverb servers that will be used to handle
    | incoming WebSocket connections. Each server may have its own
    | configuration options and may be scaled independently.
    |
    */

    'servers' => [

        'reverb' => [
            // The IP the server binds to. Must be an IP address, not a hostname —
            // ReactPHP rejects "localhost" with EINVAL. This is deliberately a
            // different env var from REVERB_HOST below, which is the hostname
            // browsers connect to.
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 8080),
            'hostname' => env('REVERB_HOSTNAME', 'localhost'),
            'options' => [
                'tls' => [],
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL', null),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME', null),
                    'password' => env('REDIS_PASSWORD', null),
                    'database' => env('REDIS_DB', '0'),
                ],
            ],
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => env('REVERB_TELESCOPE_INGEST_INTERVAL', 15),
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Reverb Applications
    |--------------------------------------------------------------------------
    |
    | Here you may define the Reverb applications that are available for
    | incoming connections. Each application is identified by an "app_id"
    | and may have its own set of allowed origins and authentication
    | credentials.
    |
    */

    'apps' => [

        'provider' => 'config',

        'apps' => [
            [
                'key' => env('REVERB_APP_KEY'),
                'secret' => env('REVERB_APP_SECRET'),
                'app_id' => env('REVERB_APP_ID'),
                'options' => [
                    'host' => env('REVERB_HOST'),
                    'port' => env('REVERB_PORT', 8080),
                    'scheme' => env('REVERB_SCHEME', 'http'),
                    'useTLS' => env('REVERB_SCHEME', 'http') === 'https',
                ],
                // Compared against the HOST only: Reverb runs the incoming
                // Origin header through parse_url(..., PHP_URL_HOST) first.
                // Entries must be hosts ("collabo.vercel.app", "*.vercel.app"),
                // never full URLs — "https://collabo.vercel.app" can't match.
                'allowed_origins' => array_filter(
                    explode(',', (string) env('REVERB_ALLOWED_ORIGINS', '*'))
                ),
                'ping_interval' => env('REVERB_APP_PING_INTERVAL', 60),
                'activity_timeout' => env('REVERB_APP_ACTIVITY_TIMEOUT', 30),
                'max_message_size' => env('REVERB_APP_MAX_MESSAGE_SIZE', 10_000),
            ],
        ],

    ],

];
