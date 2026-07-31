<?php

namespace App\Jobs;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class NotifyTaskCompleted implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public Task $task;

   public function __construct(Task $task)
    {
        $this->task = $task;
    }

    // Runs in the worker process, not during the web request.
    public function handle(): void
    {
        sleep(2); // pretend this is a slow email or Slack call

        Log::info('Task completed', [
            'id' => $this->task->id,
            'title' => $this->task->title,
        ]);
    }
}
