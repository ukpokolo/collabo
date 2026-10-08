<?php

use App\Domain\Tasks\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

// Loaded by routes/api.php inside the auth:sanctum group.

Route::apiResource('tasks', TaskController::class);
