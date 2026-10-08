<?php

namespace App\Domain\Boards\Policies;

use App\Domain\Boards\Models\Board;
use App\Domain\Users\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Non-members get 404, not 403: board ids are sequential, so a 403 would
 * confirm which ids exist. Members who lack the role get an honest 403.
 */
class BoardPolicy
{
    public function view(User $user, Board $board): Response
    {
        return $this->requireRole($user, $board, Board::ROLES);
    }

    public function update(User $user, Board $board): Response
    {
        return $this->requireRole($user, $board, [Board::ROLE_OWNER]);
    }

    public function delete(User $user, Board $board): Response
    {
        return $this->requireRole($user, $board, [Board::ROLE_OWNER]);
    }

    public function manageMembers(User $user, Board $board): Response
    {
        return $this->requireRole($user, $board, [Board::ROLE_OWNER]);
    }

    /** Create, edit and delete tasks on this board. */
    public function writeTasks(User $user, Board $board): Response
    {
        return $this->requireRole($user, $board, Board::WRITE_ROLES);
    }

    private function requireRole(User $user, Board $board, array $roles): Response
    {
        $role = $board->roleOf($user);

        if ($role === null) {
            return Response::denyAsNotFound();
        }

        return in_array($role, $roles, true)
            ? Response::allow()
            : Response::deny('Your role on this board does not allow that.');
    }
}
