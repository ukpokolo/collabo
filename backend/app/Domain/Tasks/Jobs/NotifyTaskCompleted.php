<?php

namespace App\Domain\Tasks\Jobs;

use App\Domain\Tasks\Mail\TaskCompletedMail;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Emails a task's assignee when someone else marks it Done. Dispatched only
 * behind the notify-on-complete feature flag.
 */
class NotifyTaskCompleted implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** Seconds between attempts: a mail provider blip should not lose the message. */
    public array $backoff = [30, 120];

    /** The task may be deleted before a worker gets to this; that is not a failure. */
    public bool $deleteWhenMissingModels = true;

    public function __construct(public Task $task, public int $actorId) {}

    // Runs in the worker process, not during the web request.
    public function handle(): void
    {
        $assignee = $this->task->assignee;

        // Nothing to say to nobody, or to the person who just did it themselves.
        if (! $assignee || $assignee->id === $this->actorId) {
            return;
        }

        // The task may have been reopened since this was queued.
        if ($this->task->status !== Task::STATUS_DONE) {
            return;
        }

        Mail::to($assignee->email)->send(new TaskCompletedMail(
            $this->task,
            User::find($this->actorId)?->name,
        ));
    }
}
