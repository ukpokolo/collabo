<?php

use App\Domain\Auth\Http\Controllers\LoginController;
use App\Domain\Auth\Http\Controllers\OtpController;
use App\Domain\Auth\Http\Controllers\PasswordResetController;
use App\Domain\Auth\Http\Controllers\RegisterController;
use Illuminate\Support\Facades\Route;

// Loaded by routes/api.php inside Route::prefix('auth').

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
