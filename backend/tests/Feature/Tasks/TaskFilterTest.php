<?php

namespace Tests\Feature\Tasks;

use App\Domain\Tasks\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $ada;

    private User $bob;

    protected function setUp(): void
    {
        parent::setUp();

        $this->ada = User::factory()->create();
        $this->bob = User::factory()->create();
        $this->actingAs($this->ada, 'sanctum');
    }

    private function titles(string $query = ''): array
    {
        return collect($this->getJson('/api/tasks'.$query)->assertOk()->json())->pluck('title')->sort()->values()->all();
    }

    public function test_search_matches_title_and_description_case_insensitively(): void
    {
        Task::factory()->create(['title' => 'Fix login bug', 'description' => null]);
        Task::factory()->create(['title' => 'Docs', 'description' => 'Mention the LOGIN flow']);
        Task::factory()->create(['title' => 'Unrelated', 'description' => null]);

        $this->assertSame(['Docs', 'Fix login bug'], $this->titles('?search=login'));
    }

    public function test_search_treats_like_wildcards_literally(): void
    {
        Task::factory()->create(['title' => '100% done']);
        Task::factory()->create(['title' => 'Something else']);
        Task::factory()->create(['title' => 'under_score']);

        $this->assertSame(['100% done'], $this->titles('?search=%25'));
        $this->assertSame(['under_score'], $this->titles('?search=_'));
    }

    public function test_assigned_to_supports_ids_unassigned_and_both(): void
    {
        Task::factory()->create(['title' => 'A', 'assigned_to' => $this->ada->id]);
        Task::factory()->create(['title' => 'B', 'assigned_to' => $this->bob->id]);
        Task::factory()->create(['title' => 'C', 'assigned_to' => null]);

        $this->assertSame(['A'], $this->titles("?assigned_to={$this->ada->id}"));
        $this->assertSame(['C'], $this->titles('?assigned_to=unassigned'));
        $this->assertSame(['A', 'C'], $this->titles("?assigned_to={$this->ada->id},unassigned"));
        $this->assertSame(['A', 'B'], $this->titles("?assigned_to={$this->ada->id},{$this->bob->id}"));
    }

    public function test_status_filter_and_validation(): void
    {
        Task::factory()->create(['title' => 'A', 'status' => Task::STATUS_DONE]);
        Task::factory()->create(['title' => 'B', 'status' => Task::STATUS_TODO]);

        $this->assertSame(['A'], $this->titles('?status=done'));
        $this->getJson('/api/tasks?status=bogus')->assertUnprocessable();
    }

    public function test_filters_combine(): void
    {
        Task::factory()->create(['title' => 'Match', 'status' => Task::STATUS_DONE, 'assigned_to' => $this->ada->id]);
        Task::factory()->create(['title' => 'Match too', 'status' => Task::STATUS_TODO, 'assigned_to' => $this->ada->id]);
        Task::factory()->create(['title' => 'Match', 'status' => Task::STATUS_DONE, 'assigned_to' => $this->bob->id]);

        $this->assertSame(['Match'], $this->titles("?search=match&status=done&assigned_to={$this->ada->id}"));
    }
}
