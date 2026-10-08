<?php

use App\Domain\Boards\Models\Board;
use App\Domain\Users\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Laravel strips the "private-" / "presence-" prefix before matching, so this
// single registration guards both private-board.N and presence-board.N.
// Only members of board N may subscribe. Returning an array both authorizes
// access and supplies the presence entry.
Broadcast::channel('board.{boardId}', function (User $user, int $boardId) {
    $board = Board::find($boardId);

    if (! $board || $board->roleOf($user) === null) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
    ];
});
