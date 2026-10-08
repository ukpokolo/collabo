<?php

namespace Tests\Feature\Tasks;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Jobs\NotifyTaskCompleted;
use App\Domain\Tasks\Mail\TaskCompletedMail;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Laravel\Pennant\Feature;
use Tests\TestCase;

class NotifyTaskCompletedTest extends TestCase
{
    use RefreshDatabase;

    private Board $board;

    private User $owner;

    private User $teammate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->board = Board::factory()->withOwnerMember()->create();
        $this->owner = $this->board->owner;
        $this->teammate = User::factory()->create(['email' => 'mate@example.com']);
        $this->board->members()->attach($this->teammate->id, ['role' => Board::ROLE_MEMBER]);
    }

    private function doneTask(?User $assignee): Task
    {
        return Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => Task::STATUS_DONE,
            'assigned_to' => $assignee?->id,
        ]);
    }

    public function test_the_assignee_is_emailed_when_someone_else_completes_their_task(): void
    {
        Mail::fake();

        (new NotifyTaskCompleted($this->doneTask($this->teammate), $this->owner->id))->handle();

        Mail::assertSent(TaskCompletedMail::class, fn (TaskCompletedMail $m) => $m->hasTo('mate@example.com')
            && $m->completedBy === $this->owner->name);
    }

    public function test_the_email_names_the_task_the_board_and_links_to_it(): void
    {
        $task = $this->doneTask($this->teammate);

        $html = (new TaskCompletedMail($task, 'Olive Owner'))->render();

        $this->assertStringContainsString($task->title, $html);
        $this->assertStringContainsString($this->board->name, $html);
        $this->assertStringContainsString('Olive Owner', $html);
        $this->assertStringContainsString('/tasks/'.$task->id, $html);
    }

    public function test_nobody_is_emailed_when_you_complete_your_own_task(): void
    {
        Mail::fake();

        (new NotifyTaskCompleted($this->doneTask($this->teammate), $this->teammate->id))->handle();

        Mail::assertNothingSent();
    }

    public function test_nobody_is_emailed_for_an_unassigned_task(): void
    {
        Mail::fake();

        (new NotifyTaskCompleted($this->doneTask(null), $this->owner->id))->handle();

        Mail::assertNothingSent();
    }

    public function test_a_task_reopened_before_the_worker_ran_sends_nothing(): void
    {
        Mail::fake();
        $task = $this->doneTask($this->teammate);
        $task->update(['status' => Task::STATUS_IN_PROGRESS]);

        (new NotifyTaskCompleted($task, $this->owner->id))->handle();

        Mail::assertNothingSent();
    }

    public function test_the_job_is_tolerant_of_the_task_being_deleted_and_retries_with_backoff(): void
    {
        $job = new NotifyTaskCompleted($this->doneTask($this->teammate), $this->owner->id);

        $this->assertTrue($job->deleteWhenMissingModels);
        $this->assertSame(3, $job->tries);
        $this->assertSame([30, 120], $job->backoff);
    }

    public function test_completing_a_task_queues_the_job_with_who_did_it_when_the_flag_is_on(): void
    {
        Bus::fake([NotifyTaskCompleted::class]);
        Feature::for($this->owner)->activate('notify-on-complete');
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'status' => Task::STATUS_IN_PROGRESS,
            'assigned_to' => $this->teammate->id,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/tasks/{$task->id}", ['status' => Task::STATUS_DONE])->assertOk();

        Bus::assertDispatched(NotifyTaskCompleted::class, fn (NotifyTaskCompleted $job) => $job->task->is($task)
            && $job->actorId === $this->owner->id);
    }
}
