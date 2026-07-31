<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Laravel strips the "private-" / "presence-" prefix before matching, so this
// single registration guards both private-board.N and presence-board.N.
// Returning an array both authorizes access and supplies the presence entry.
Broadcast::channel('board.{boardId}', function (User $user, int $boardId) {
    return [
        'id' => $user->id,
        'name' => $user->name,
    ];
});
