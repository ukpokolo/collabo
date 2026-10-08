<?php

use App\Domain\Boards\Http\Controllers\BoardController;
use App\Domain\Boards\Http\Controllers\BoardMemberController;
use Illuminate\Support\Facades\Route;

// Loaded by routes/api.php inside the auth:sanctum group.

Route::apiResource('boards', BoardController::class);

Route::controller(BoardMemberController::class)->group(function () {
    Route::get('boards/{board}/members', 'index');
    Route::post('boards/{board}/members', 'store')->middleware('throttle:board-members');
    Route::put('boards/{board}/members/{user}', 'update');
    Route::delete('boards/{board}/members/{user}', 'destroy');
});
