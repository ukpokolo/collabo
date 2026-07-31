<?php

namespace App\Http\Controllers;

use App\Events\TaskUpdated;
use App\Jobs\NotifyTaskCompleted;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'assigned_to' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:'.implode(',', Task::STATUSES)],
        ]);

        $tasks = Task::query()
            ->with('assignee')
            ->when($filters['search'] ?? null, function ($query, string $search) {
                // Escape LIKE wildcards so a literal % doesn't match everything.
                $term = '%'.addcslashes($search, '%_\\').'%';

                $query->where(function ($q) use ($term) {
                    $q->where('title', 'like', $term)
                        ->orWhere('description', 'like', $term);
                });
            })
            ->when($filters['assigned_to'] ?? null, function ($query, string $assigned) {
                $values = array_filter(array_map('trim', explode(',', $assigned)), fn ($v) => $v !== '');
                $ids = array_values(array_filter($values, 'is_numeric'));
                $wantsUnassigned = in_array('unassigned', $values, true);

                $query->where(function ($q) use ($ids, $wantsUnassigned) {
                    if ($ids) {
                        $q->orWhereIn('assigned_to', $ids);
                    }
                    if ($wantsUnassigned) {
                        $q->orWhereNull('assigned_to');
                    }
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', Task::STATUSES)],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $validated['status'] = $validated['status'] ?? Task::STATUS_TODO;

        $task = Task::create($validated);
        $task->load('assignee');

        broadcast(new TaskUpdated($task, 'created'))->toOthers();

        return response()->json($task, Response::HTTP_CREATED);
    }

    public function show(Task $task): JsonResponse
    {
        return response()->json($task->load('assignee'));
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', Task::STATUSES)],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $wasDone = $task->status === Task::STATUS_DONE;

        $task->update($validated);
        $task->load('assignee');

        if ($task->status === Task::STATUS_DONE && ! $wasDone) {
            NotifyTaskCompleted::dispatch($task);
        }

        broadcast(new TaskUpdated($task, 'updated'))->toOthers();

        return response()->json($task);
    }

    public function destroy(Task $task): JsonResponse
    {
        $id = $task->id;
        $task->delete();

        // The row is gone, so only the id can be broadcast.
        broadcast(new TaskUpdated(['id' => $id], 'deleted'))->toOthers();

        return response()->json(['message' => 'Task deleted.']);
    }
}
