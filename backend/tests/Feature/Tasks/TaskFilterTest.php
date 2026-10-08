<?php

namespace Tests\Feature\Tasks;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $ada;

    private User $bob;

    private Board $board;

    protected function setUp(): void
    {
        parent::setUp();

        $this->ada = User::factory()->create();
        $this->bob = User::factory()->create();
        $this->board = Board::factory()->create(['owner_id' => $this->ada->id]);
        $this->board->members()->attach([
            $this->ada->id => ['role' => Board::ROLE_OWNER],
            $this->bob->id => ['role' => Board::ROLE_MEMBER],
        ]);
        $this->actingAs($this->ada, 'sanctum');
    }

    private function task(array $attributes = []): Task
    {
        return Task::factory()->create($attributes + ['board_id' => $this->board->id]);
    }

    private function titles(string $query = ''): array
    {
        return collect($this->getJson("/api/boards/{$this->board->id}/tasks".$query)->assertOk()->json())->pluck('title')->sort()->values()->all();
    }

    public function test_search_matches_title_and_description_case_insensitively(): void
    {
        $this->task(['title' => 'Fix login bug', 'description' => null]);
        $this->task(['title' => 'Docs', 'description' => 'Mention the LOGIN flow']);
        $this->task(['title' => 'Unrelated', 'description' => null]);

        $this->assertSame(['Docs', 'Fix login bug'], $this->titles('?search=login'));
    }

    public function test_search_treats_like_wildcards_literally(): void
    {
        $this->task(['title' => '100% done']);
        $this->task(['title' => 'Something else']);
        $this->task(['title' => 'under_score']);

        $this->assertSame(['100% done'], $this->titles('?search=%25'));
        $this->assertSame(['under_score'], $this->titles('?search=_'));
    }

    public function test_assigned_to_supports_ids_unassigned_and_both(): void
    {
        $this->task(['title' => 'A', 'assigned_to' => $this->ada->id]);
        $this->task(['title' => 'B', 'assigned_to' => $this->bob->id]);
        $this->task(['title' => 'C', 'assigned_to' => null]);

        $this->assertSame(['A'], $this->titles("?assigned_to={$this->ada->id}"));
        $this->assertSame(['C'], $this->titles('?assigned_to=unassigned'));
        $this->assertSame(['A', 'C'], $this->titles("?assigned_to={$this->ada->id},unassigned"));
        $this->assertSame(['A', 'B'], $this->titles("?assigned_to={$this->ada->id},{$this->bob->id}"));
    }

    public function test_status_filter_and_validation(): void
    {
        $this->task(['title' => 'A', 'status' => Task::STATUS_DONE]);
        $this->task(['title' => 'B', 'status' => Task::STATUS_TODO]);

        $this->assertSame(['A'], $this->titles('?status=done'));
        $this->getJson("/api/boards/{$this->board->id}/tasks?status=bogus")->assertUnprocessable();
    }

    public function test_only_the_requested_boards_tasks_are_returned(): void
    {
        $this->task(['title' => 'Mine']);
        Task::factory()->create(['title' => 'Elsewhere']);

        $this->assertSame(['Mine'], $this->titles());
        $this->assertSame([], $this->titles('?search=Elsewhere'));
    }

    public function test_filters_combine(): void
    {
        $this->task(['title' => 'Match', 'status' => Task::STATUS_DONE, 'assigned_to' => $this->ada->id]);
        $this->task(['title' => 'Match too', 'status' => Task::STATUS_TODO, 'assigned_to' => $this->ada->id]);
        $this->task(['title' => 'Match', 'status' => Task::STATUS_DONE, 'assigned_to' => $this->bob->id]);

        $this->assertSame(['Match'], $this->titles("?search=match&status=done&assigned_to={$this->ada->id}"));
    }
}
