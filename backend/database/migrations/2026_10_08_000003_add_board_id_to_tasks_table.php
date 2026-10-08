<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds tasks.board_id as nullable and moves existing data onto a default
     * board. The NOT NULL constraint comes in a later migration, once the API
     * always supplies a board.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('board_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        $taskCount = DB::table('tasks')->count();
        $firstUser = DB::table('users')->orderBy('id')->first();

        if ($taskCount > 0 && ! $firstUser) {
            // No user to own the tasks' board. Refuse rather than orphan or drop them.
            throw new RuntimeException('tasks exist but there are no users to own the default board.');
        }

        if (! $firstUser) {
            return;
        }

        $now = now();
        $boardId = DB::table('boards')->insertGetId([
            'name' => 'Team Board',
            'owner_id' => $firstUser->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('board_user')->insert(
            DB::table('users')->orderBy('id')->pluck('id')->map(fn ($id) => [
                'board_id' => $boardId,
                'user_id' => $id,
                'role' => $id === $firstUser->id ? 'owner' : 'member',
                'created_at' => $now,
                'updated_at' => $now,
            ])->all()
        );

        DB::table('tasks')->update(['board_id' => $boardId]);
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('board_id');
        });
    }
};
