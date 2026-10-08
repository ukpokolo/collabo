<?php

namespace Tests\Feature\Boards;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardApiTest extends TestCase
{
    use RefreshDatabase;

    private function boardWithMember(User $user, string $role): Board
    {
        $board = Board::factory()->withOwnerMember()->create();
        $board->members()->attach($user->id, ['role' => $role]);

        return $board;
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/boards')->assertUnauthorized();
        $this->postJson('/api/boards', ['name' => 'x'])->assertUnauthorized();
    }

    public function test_index_lists_only_boards_the_user_belongs_to_with_their_role(): void
    {
        $me = User::factory()->create();
        $mine = $this->boardWithMember($me, Board::ROLE_VIEWER);
        Board::factory()->withOwnerMember()->create();

        $this->actingAs($me, 'sanctum')->getJson('/api/boards')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $mine->id)
            ->assertJsonPath('0.role', Board::ROLE_VIEWER)
            ->assertJsonPath('0.members_count', 2);
    }

    public function test_store_creates_a_board_owned_by_the_caller(): void
    {
        $me = User::factory()->create();

        $this->actingAs($me, 'sanctum')->postJson('/api/boards', ['name' => '  Roadmap  '])
            ->assertCreated()
            ->assertJsonPath('name', 'Roadmap')
            ->assertJsonPath('role', Board::ROLE_OWNER);

        $board = Board::first();
        $this->assertSame($me->id, $board->owner_id);
        $this->assertSame(Board::ROLE_OWNER, $board->roleOf($me));
    }

    public function test_store_validates_the_name(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');

        $this->postJson('/api/boards', [])->assertJsonValidationErrors('name');
        $this->postJson('/api/boards', ['name' => str_repeat('a', 81)])->assertJsonValidationErrors('name');
    }

    public function test_non_members_get_404_not_403_so_ids_cannot_be_probed(): void
    {
        $board = Board::factory()->withOwnerMember()->create();
        $this->actingAs(User::factory()->create(), 'sanctum');

        $this->getJson("/api/boards/{$board->id}")->assertNotFound();
        $this->putJson("/api/boards/{$board->id}", ['name' => 'x'])->assertNotFound();
        $this->deleteJson("/api/boards/{$board->id}")->assertNotFound();
        $this->getJson("/api/boards/{$board->id}/members")->assertNotFound();
    }

    public function test_only_the_owner_can_rename_or_delete(): void
    {
        $member = User::factory()->create();
        $board = $this->boardWithMember($member, Board::ROLE_MEMBER);

        $this->actingAs($member, 'sanctum');
        $this->getJson("/api/boards/{$board->id}")->assertOk();
        $this->putJson("/api/boards/{$board->id}", ['name' => 'x'])->assertForbidden();
        $this->deleteJson("/api/boards/{$board->id}")->assertForbidden();

        $this->actingAs($board->owner, 'sanctum');
        $this->putJson("/api/boards/{$board->id}", ['name' => 'Renamed'])->assertOk()->assertJsonPath('name', 'Renamed');
        $this->deleteJson("/api/boards/{$board->id}")->assertOk();
        $this->assertModelMissing($board);
    }

    public function test_deleting_a_board_removes_its_tasks_and_memberships(): void
    {
        $board = Board::factory()->withOwnerMember()->create();
        Task::factory()->create(['board_id' => $board->id]);

        $this->actingAs($board->owner, 'sanctum')->deleteJson("/api/boards/{$board->id}")->assertOk();

        $this->assertDatabaseCount('tasks', 0);
        $this->assertDatabaseCount('board_user', 0);
    }
}
