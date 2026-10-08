<?php

namespace Database\Seeders;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = User::factory(3)->create();

        $board = Board::factory()->create(['name' => 'Demo board', 'owner_id' => $users[0]->id]);
        foreach ($users as $user) {
            $board->members()->attach($user->id, [
                'role' => $user->is($users[0]) ? Board::ROLE_OWNER : Board::ROLE_MEMBER,
            ]);
        }

        Task::factory(6)->create([
            'board_id' => $board->id,
            'assigned_to' => $users->random()->id,
        ]);
    }
}
