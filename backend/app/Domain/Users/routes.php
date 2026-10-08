<?php

use App\Domain\Users\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Loaded by routes/api.php inside the auth:sanctum group.

Route::get('users', [UserController::class, 'index']);
