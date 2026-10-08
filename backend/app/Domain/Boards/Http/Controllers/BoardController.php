<?php

namespace App\Domain\Boards\Http\Controllers;

use App\Domain\Boards\Models\Board;
use App\Domain\Boards\Services\BoardService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class BoardController extends Controller
{
    public function __construct(private readonly BoardService $boards) {}

    public function index(Request $request): JsonResponse
    {
        $boards = $request->user()->boards()
            ->withCount('members')
            ->orderBy('boards.name')
            ->get()
            ->map(fn (Board $board) => $this->present($board, $board->pivot->role));

        return response()->json($boards);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:1', 'max:80']]);

        $board = $this->boards->createFor($request->user(), trim($data['name']));

        return response()->json($this->present($board->loadCount('members'), Board::ROLE_OWNER), Response::HTTP_CREATED);
    }

    public function show(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        return response()->json($this->present($board->loadCount('members'), $board->roleOf($request->user())));
    }

    public function update(Request $request, Board $board): JsonResponse
    {
        $this->authorize('update', $board);

        $data = $request->validate(['name' => ['required', 'string', 'min:1', 'max:80']]);
        $board->update(['name' => trim($data['name'])]);

        return response()->json($this->present($board->loadCount('members'), Board::ROLE_OWNER));
    }

    public function destroy(Board $board): JsonResponse
    {
        $this->authorize('delete', $board);

        // Members and tasks go with it (cascading foreign keys).
        $board->delete();

        return response()->json(['message' => 'Board deleted.']);
    }

    private function present(Board $board, ?string $role): array
    {
        return [
            'id' => $board->id,
            'name' => $board->name,
            'owner_id' => $board->owner_id,
            'role' => $role,
            'members_count' => $board->members_count ?? null,
        ];
    }
}
