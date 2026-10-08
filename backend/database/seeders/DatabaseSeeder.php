<?php

namespace Database\Seeders;

use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = User::factory(3)->create();

        Task::factory(6)->create([
            'assigned_to' => $users->random()->id,
        ]);
    }
}
