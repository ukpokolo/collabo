<?php

namespace App\Domain\Tasks\Policies;

use App\Domain\Boards\Policies\BoardPolicy;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Auth\Access\Response;

/** A task is exactly as accessible as the board it sits on. */
class TaskPolicy
{
    public function __construct(private readonly BoardPolicy $boards) {}

    public function view(User $user, Task $task): Response
    {
        return $this->boards->view($user, $task->board);
    }

    public function update(User $user, Task $task): Response
    {
        return $this->boards->writeTasks($user, $task->board);
    }

    public function delete(User $user, Task $task): Response
    {
        return $this->boards->writeTasks($user, $task->board);
    }
}
