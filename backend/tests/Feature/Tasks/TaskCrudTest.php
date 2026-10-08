<?php

namespace Tests\Feature\Tasks;

use App\Events\TaskUpdated;
use App\Jobs\NotifyTaskCompleted;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class TaskCrudTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create(), 'sanctum');
        // NotifyTaskCompleted sleeps; never run it for real in tests.
        Bus::fake([NotifyTaskCompleted::class]);
    }

    public function test_store_creates_a_task_defaulting_to_todo_and_broadcasts(): void
    {
        Event::fake([TaskUpdated::class]);

        $this->postJson('/api/tasks', ['title' => 'Write tests'])
            ->assertCreated()
            ->assertJsonPath('title', 'Write tests')
            ->assertJsonPath('status', Task::STATUS_TODO);

        Event::assertDispatched(TaskUpdated::class, fn (TaskUpdated $e) => $e->type === 'created');
    }

    public function test_store_validates_input(): void
    {
        $this->postJson('/api/tasks', [])->assertUnprocessable()->assertJsonValidationErrors('title');
        $this->postJson('/api/tasks', ['title' => 'x', 'status' => 'bogus'])->assertJsonValidationErrors('status');
        $this->postJson('/api/tasks', ['title' => 'x', 'assigned_to' => 9999])->assertJsonValidationErrors('assigned_to');
        $this->postJson('/api/tasks', ['title' => str_repeat('a', 256)])->assertJsonValidationErrors('title');
    }

    public function test_update_changes_fields_and_broadcasts(): void
    {
        Event::fake([TaskUpdated::class]);
        $task = Task::factory()->create(['status' => Task::STATUS_TODO]);

        $this->putJson("/api/tasks/{$task->id}", ['status' => Task::STATUS_IN_PROGRESS])
            ->assertOk()
            ->assertJsonPath('status', Task::STATUS_IN_PROGRESS);

        Event::assertDispatched(TaskUpdated::class, fn (TaskUpdated $e) => $e->type === 'updated');
        Bus::assertNotDispatched(NotifyTaskCompleted::class);
    }

    public function test_moving_to_done_dispatches_the_completion_job_once(): void
    {
        $task = Task::factory()->create(['status' => Task::STATUS_IN_PROGRESS]);

        $this->putJson("/api/tasks/{$task->id}", ['status' => Task::STATUS_DONE])->assertOk();
        $this->putJson("/api/tasks/{$task->id}", ['title' => 'Renamed'])->assertOk();

        Bus::assertDispatchedTimes(NotifyTaskCompleted::class, 1);
    }

    public function test_update_can_assign_and_unassign(): void
    {
        $assignee = User::factory()->create();
        $task = Task::factory()->create();

        $this->putJson("/api/tasks/{$task->id}", ['assigned_to' => $assignee->id])
            ->assertOk()->assertJsonPath('assignee.id', $assignee->id);

        $this->putJson("/api/tasks/{$task->id}", ['assigned_to' => null])
            ->assertOk()->assertJsonPath('assigned_to', null);
    }

    public function test_destroy_deletes_and_broadcasts_only_the_id(): void
    {
        Event::fake([TaskUpdated::class]);
        $task = Task::factory()->create();

        $this->deleteJson("/api/tasks/{$task->id}")->assertOk();

        $this->assertModelMissing($task);
        Event::assertDispatched(TaskUpdated::class, fn (TaskUpdated $e) => $e->type === 'deleted'
            && $e->task === ['id' => $task->id]);
    }

    public function test_show_and_missing_task(): void
    {
        $task = Task::factory()->create();

        $this->getJson("/api/tasks/{$task->id}")->assertOk()->assertJsonPath('id', $task->id);
        $this->getJson('/api/tasks/999999')->assertNotFound();
        $this->putJson('/api/tasks/999999', ['title' => 'x'])->assertNotFound();
        $this->deleteJson('/api/tasks/999999')->assertNotFound();
    }

    public function test_users_endpoint_exposes_only_safe_fields(): void
    {
        $response = $this->getJson('/api/users')->assertOk();

        $this->assertSame(['id', 'name', 'email'], array_keys($response->json('0')));
    }
}
