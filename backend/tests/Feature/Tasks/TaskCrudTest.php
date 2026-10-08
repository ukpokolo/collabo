<?php

namespace Tests\Feature\Tasks;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Events\TaskUpdated;
use App\Domain\Tasks\Jobs\NotifyTaskCompleted;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Laravel\Pennant\Feature;
use Tests\TestCase;

class TaskCrudTest extends TestCase
{
    use RefreshDatabase;

    private Board $board;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->board = Board::factory()->withOwnerMember()->create();
        $this->user = $this->board->owner;
        $this->actingAs($this->user, 'sanctum');
        // NotifyTaskCompleted sleeps; never run it for real in tests.
        Bus::fake([NotifyTaskCompleted::class]);
    }

    private function tasksUrl(?Board $board = null): string
    {
        return '/api/boards/'.($board ?? $this->board)->id.'/tasks';
    }

    private function join(string $role): User
    {
        $user = User::factory()->create();
        $this->board->members()->attach($user->id, ['role' => $role]);

        return $user;
    }

    public function test_store_creates_a_task_on_the_board_defaulting_to_todo_and_broadcasts_to_it(): void
    {
        Event::fake([TaskUpdated::class]);

        $this->postJson($this->tasksUrl(), ['title' => 'Write tests'])
            ->assertCreated()
            ->assertJsonPath('title', 'Write tests')
            ->assertJsonPath('status', Task::STATUS_TODO)
            ->assertJsonPath('board_id', $this->board->id);

        Event::assertDispatched(TaskUpdated::class, fn (TaskUpdated $e) => $e->type === 'created'
            && $e->boardId === $this->board->id
            && $e->broadcastOn()[0]->name === 'private-board.'.$this->board->id);
    }

    public function test_store_validates_input(): void
    {
        $this->postJson($this->tasksUrl(), [])->assertUnprocessable()->assertJsonValidationErrors('title');
        $this->postJson($this->tasksUrl(), ['title' => 'x', 'status' => 'bogus'])->assertJsonValidationErrors('status');
        $this->postJson($this->tasksUrl(), ['title' => 'x', 'assigned_to' => 9999])->assertJsonValidationErrors('assigned_to');
        $this->postJson($this->tasksUrl(), ['title' => str_repeat('a', 256)])->assertJsonValidationErrors('title');
    }

    public function test_assignee_must_be_a_member_of_the_tasks_board(): void
    {
        $outsider = User::factory()->create();
        $member = $this->join(Board::ROLE_MEMBER);
        $task = Task::factory()->create(['board_id' => $this->board->id]);

        $this->postJson($this->tasksUrl(), ['title' => 'x', 'assigned_to' => $outsider->id])
            ->assertJsonValidationErrors('assigned_to');
        $this->putJson("/api/tasks/{$task->id}", ['assigned_to' => $outsider->id])
            ->assertJsonValidationErrors('assigned_to');

        $this->putJson("/api/tasks/{$task->id}", ['assigned_to' => $member->id])
            ->assertOk()->assertJsonPath('assignee.id', $member->id);
        $this->putJson("/api/tasks/{$task->id}", ['assigned_to' => null])
            ->assertOk()->assertJsonPath('assigned_to', null);
    }

    public function test_update_changes_fields_and_broadcasts_to_the_tasks_board(): void
    {
        Event::fake([TaskUpdated::class]);
        $task = Task::factory()->create(['board_id' => $this->board->id, 'status' => Task::STATUS_TODO]);

        $this->putJson("/api/tasks/{$task->id}", ['status' => Task::STATUS_IN_PROGRESS])
            ->assertOk()->assertJsonPath('status', Task::STATUS_IN_PROGRESS);

        Event::assertDispatched(TaskUpdated::class, fn (TaskUpdated $e) => $e->type === 'updated'
            && $e->boardId === $this->board->id);
        Bus::assertNotDispatched(NotifyTaskCompleted::class);
    }

    public function test_completion_job_is_off_by_default_behind_its_flag(): void
    {
        $task = Task::factory()->create(['board_id' => $this->board->id, 'status' => Task::STATUS_IN_PROGRESS]);

        $this->putJson("/api/tasks/{$task->id}", ['status' => Task::STATUS_DONE])->assertOk();

        Bus::assertNotDispatched(NotifyTaskCompleted::class);
    }

    public function test_moving_to_done_dispatches_the_completion_job_once_when_the_flag_is_on(): void
    {
        Feature::for($this->user)->activate('notify-on-complete');
        $task = Task::factory()->create(['board_id' => $this->board->id, 'status' => Task::STATUS_IN_PROGRESS]);

        $this->putJson("/api/tasks/{$task->id}", ['status' => Task::STATUS_DONE])->assertOk();
        $this->putJson("/api/tasks/{$task->id}", ['title' => 'Renamed'])->assertOk();

        Bus::assertDispatchedTimes(NotifyTaskCompleted::class, 1);
    }

    public function test_destroy_deletes_and_broadcasts_only_the_id(): void
    {
        Event::fake([TaskUpdated::class]);
        $task = Task::factory()->create(['board_id' => $this->board->id]);

        $this->deleteJson("/api/tasks/{$task->id}")->assertOk();

        $this->assertModelMissing($task);
        Event::assertDispatched(TaskUpdated::class, fn (TaskUpdated $e) => $e->type === 'deleted'
            && $e->task === ['id' => $task->id]
            && $e->boardId === $this->board->id);
    }

    public function test_show_and_missing_task(): void
    {
        $task = Task::factory()->create(['board_id' => $this->board->id]);

        $this->getJson("/api/tasks/{$task->id}")->assertOk()->assertJsonPath('id', $task->id);
        $this->getJson('/api/tasks/999999')->assertNotFound();
        $this->putJson('/api/tasks/999999', ['title' => 'x'])->assertNotFound();
        $this->deleteJson('/api/tasks/999999')->assertNotFound();
    }

    public function test_viewers_can_read_but_not_write(): void
    {
        $viewer = $this->join(Board::ROLE_VIEWER);
        $task = Task::factory()->create(['board_id' => $this->board->id]);
        $this->actingAs($viewer, 'sanctum');

        $this->getJson($this->tasksUrl())->assertOk();
        $this->getJson("/api/tasks/{$task->id}")->assertOk();
        $this->postJson($this->tasksUrl(), ['title' => 'nope'])->assertForbidden();
        $this->putJson("/api/tasks/{$task->id}", ['title' => 'nope'])->assertForbidden();
        $this->deleteJson("/api/tasks/{$task->id}")->assertForbidden();
        $this->assertModelExists($task);
    }

    public function test_members_can_write(): void
    {
        $member = $this->join(Board::ROLE_MEMBER);
        $this->actingAs($member, 'sanctum');

        $this->postJson($this->tasksUrl(), ['title' => 'mine'])->assertCreated();
    }

    public function test_non_members_cannot_see_or_touch_another_boards_tasks(): void
    {
        $task = Task::factory()->create(['board_id' => $this->board->id]);
        $this->actingAs(User::factory()->create(), 'sanctum');

        $this->getJson($this->tasksUrl())->assertNotFound();
        $this->postJson($this->tasksUrl(), ['title' => 'x'])->assertNotFound();
        $this->getJson("/api/tasks/{$task->id}")->assertNotFound();
        $this->putJson("/api/tasks/{$task->id}", ['title' => 'x'])->assertNotFound();
        $this->deleteJson("/api/tasks/{$task->id}")->assertNotFound();
        $this->assertModelExists($task);
        $this->assertSame($task->title, $task->fresh()->title);
    }

    public function test_a_task_cannot_be_moved_to_another_board_through_the_update_endpoint(): void
    {
        $other = Board::factory()->withOwnerMember()->create();
        $task = Task::factory()->create(['board_id' => $this->board->id]);

        $this->putJson("/api/tasks/{$task->id}", ['title' => 'same', 'board_id' => $other->id])->assertOk();

        $this->assertSame($this->board->id, $task->fresh()->board_id);
    }
}
