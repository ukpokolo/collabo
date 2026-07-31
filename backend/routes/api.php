<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\OtpController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [RegisterController::class, 'store'])
        ->middleware('throttle:auth-register');

    Route::post('login', [LoginController::class, 'store'])
        ->middleware('throttle:auth-login');

    Route::post('verify-email', [OtpController::class, 'verifyEmail'])
        ->middleware('throttle:auth-verify');

    Route::post('reset-password', [PasswordResetController::class, 'reset'])
        ->middleware('throttle:auth-verify');

    Route::post('resend-otp', [OtpController::class, 'resend'])
        ->middleware('throttle:auth-send-code');

    Route::post('forgot-password', [PasswordResetController::class, 'sendCode'])
        ->middleware('throttle:auth-send-code');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('user', [LoginController::class, 'me']);
        Route::post('logout', [LoginController::class, 'destroy']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('users', [UserController::class, 'index']);
    Route::apiResource('tasks', TaskController::class);
});
