<?php

namespace App\Domain\Boards\Http\Controllers;

use App\Domain\Boards\Models\Board;
use App\Domain\Users\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BoardMemberController extends Controller
{
    /** Roles an owner may hand out. Ownership transfer is not supported yet. */
    private const ASSIGNABLE = [Board::ROLE_MEMBER, Board::ROLE_VIEWER];

    public function index(Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        return response()->json(
            $board->members()->orderBy('users.name')->get()->map(fn (User $user) => $this->present($user))
        );
    }

    public function store(Request $request, Board $board): JsonResponse
    {
        $this->authorize('manageMembers', $board);

        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'role' => ['sometimes', Rule::in(self::ASSIGNABLE)],
        ]);

        $user = User::where('email', strtolower(trim($data['email'])))->first();

        if (! $user) {
            throw ValidationException::withMessages(['email' => 'No account with that email.']);
        }

        if ($board->roleOf($user) !== null) {
            throw ValidationException::withMessages(['email' => 'That person is already on this board.']);
        }

        $board->members()->attach($user->id, ['role' => $data['role'] ?? Board::ROLE_MEMBER]);

        return response()->json($this->present($board->members()->find($user->id)), Response::HTTP_CREATED);
    }

    public function update(Request $request, Board $board, User $user): JsonResponse
    {
        $this->authorize('manageMembers', $board);

        $current = $board->roleOf($user) ?? abort(Response::HTTP_NOT_FOUND);

        if ($current === Board::ROLE_OWNER) {
            throw ValidationException::withMessages(['role' => "The owner's role cannot be changed."]);
        }

        $data = $request->validate(['role' => ['required', Rule::in(self::ASSIGNABLE)]]);
        $board->members()->updateExistingPivot($user->id, ['role' => $data['role']]);

        return response()->json($this->present($board->members()->find($user->id)));
    }

    public function destroy(Request $request, Board $board, User $user): JsonResponse
    {
        $current = $board->roleOf($user) ?? abort(Response::HTTP_NOT_FOUND);

        // Anyone may leave; removing someone else is the owner's call.
        if ($request->user()->id !== $user->id) {
            $this->authorize('manageMembers', $board);
        } else {
            $this->authorize('view', $board);
        }

        if ($current === Board::ROLE_OWNER) {
            throw ValidationException::withMessages(['user' => 'The owner cannot be removed. Delete the board instead.']);
        }

        // Their assigned tasks stay on the board, unassigned.
        $board->tasks()->where('assigned_to', $user->id)->update(['assigned_to' => null]);
        $board->members()->detach($user->id);

        return response()->json(['message' => 'Member removed.']);
    }

    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->pivot->role,
        ];
    }
}
