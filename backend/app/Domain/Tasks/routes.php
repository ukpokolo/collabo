<?php

use App\Domain\Tasks\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

// Loaded by routes/api.php inside the auth:sanctum group.
// List and create hang off a board; show, update and delete address the task
// directly (the board is found through the task).

Route::apiResource('boards.tasks', TaskController::class)->shallow();
