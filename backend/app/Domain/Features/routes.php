<?php

use App\Domain\Features\Http\Controllers\FeatureController;
use Illuminate\Support\Facades\Route;

// Loaded by routes/api.php inside the auth:sanctum group.

Route::get('features', [FeatureController::class, 'index']);
