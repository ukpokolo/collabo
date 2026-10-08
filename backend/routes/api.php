<?php

use Illuminate\Support\Facades\Route;

// Each domain owns its routes in app/Domain/<Name>/routes.php.
// This file only decides the prefix and middleware they sit behind.

Route::prefix('auth')->group(app_path('Domain/Auth/routes.php'));

Route::middleware('auth:sanctum')->group(function () {
    Route::group([], app_path('Domain/Users/routes.php'));
    Route::group([], app_path('Domain/Tasks/routes.php'));
});
