<?php

namespace App\Domain\Tasks\Events;

use App\Domain\Tasks\Models\Task;
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

    /** Which board's channel this goes to; not part of the payload. */
    public int $boardId;

    public function __construct(Task|array $task, string $type, int $boardId)
    {
        $this->task = $task;
        $this->type = $type;
        $this->boardId = $boardId;
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('board.'.$this->boardId)];
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
