<?php

namespace App\Domain\Boards\Services;

use App\Domain\Boards\Models\Board;
use App\Domain\Users\Models\User;
use Illuminate\Support\Facades\DB;

class BoardService
{
    /** Create a board and enrol its creator as owner, atomically. */
    public function createFor(User $owner, string $name): Board
    {
        return DB::transaction(function () use ($owner, $name) {
            $board = Board::create(['name' => $name, 'owner_id' => $owner->id]);
            $board->members()->attach($owner->id, ['role' => Board::ROLE_OWNER]);

            return $board;
        });
    }
}
