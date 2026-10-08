<?php

namespace Tests\Feature\Boards;

use App\Domain\Boards\Models\Board;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_task_cannot_exist_without_a_board(): void
    {
        $this->expectException(QueryException::class);

        DB::table('tasks')->insert(['title' => 'Orphan', 'status' => 'todo', 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_a_member_cannot_be_enrolled_twice(): void
    {
        $board = Board::factory()->withOwnerMember()->create();

        $this->expectException(QueryException::class);

        $board->members()->attach($board->owner_id, ['role' => 'member']);
    }
}
