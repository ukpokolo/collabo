<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** An array like ['id' => 5] when the task was deleted. */
    public Task|array $task;

    public string $type;

    public function __construct(Task|array $task, string $type)
    {
        $this->task = $task;
        $this->type = $type;
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('board.1')];
    }

    public function broadcastAs(): string
    {
        return 'task.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'type' => $this->type,
            'task' => $this->task,
        ];
    }
}
