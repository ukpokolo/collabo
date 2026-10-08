<?php

use App\Domain\Features\FeatureServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\BroadcastServiceProvider;

return [
    FeatureServiceProvider::class,
    AppServiceProvider::class,
    BroadcastServiceProvider::class,
];
