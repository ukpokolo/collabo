<?php

namespace Tests\Feature\Boards;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardMemberTest extends TestCase
{
    use RefreshDatabase;

    private Board $board;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->board = Board::factory()->withOwnerMember()->create();
        $this->owner = $this->board->owner;
    }

    private function join(User $user, string $role): User
    {
        $this->board->members()->attach($user->id, ['role' => $role]);

        return $user;
    }

    public function test_members_can_list_the_roster_but_outsiders_cannot(): void
    {
        $member = $this->join(User::factory()->create(), Board::ROLE_VIEWER);

        $this->actingAs($member, 'sanctum')->getJson("/api/boards/{$this->board->id}/members")
            ->assertOk()->assertJsonCount(2)->assertJsonStructure([['id', 'name', 'email', 'role']]);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson("/api/boards/{$this->board->id}/members")->assertNotFound();
    }

    public function test_owner_adds_an_existing_user_by_email_defaulting_to_member(): void
    {
        $newcomer = User::factory()->create(['email' => 'new@example.com']);

        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/boards/{$this->board->id}/members", ['email' => ' New@Example.com '])
            ->assertCreated()->assertJsonPath('role', Board::ROLE_MEMBER);

        $this->assertSame(Board::ROLE_MEMBER, $this->board->roleOf($newcomer));
    }

    public function test_adding_validates_email_role_and_duplicates(): void
    {
        $existing = $this->join(User::factory()->create(), Board::ROLE_MEMBER);
        $this->actingAs($this->owner, 'sanctum');
        $url = "/api/boards/{$this->board->id}/members";

        $this->postJson($url, ['email' => 'nobody@example.com'])->assertJsonValidationErrors('email');
        $this->postJson($url, ['email' => $existing->email])->assertJsonValidationErrors('email');
        $this->postJson($url, ['email' => User::factory()->create()->email, 'role' => 'owner'])->assertJsonValidationErrors('role');
    }

    public function test_non_owners_cannot_manage_members(): void
    {
        $member = $this->join(User::factory()->create(), Board::ROLE_MEMBER);
        $other = $this->join(User::factory()->create(), Board::ROLE_MEMBER);
        $url = "/api/boards/{$this->board->id}/members";

        $this->actingAs($member, 'sanctum');
        $this->postJson($url, ['email' => User::factory()->create()->email])->assertForbidden();
        $this->putJson("$url/{$other->id}", ['role' => 'viewer'])->assertForbidden();
        $this->deleteJson("$url/{$other->id}")->assertForbidden();
    }

    public function test_owner_changes_roles_but_never_the_owners_own(): void
    {
        $member = $this->join(User::factory()->create(), Board::ROLE_MEMBER);
        $this->actingAs($this->owner, 'sanctum');
        $url = "/api/boards/{$this->board->id}/members";

        $this->putJson("$url/{$member->id}", ['role' => 'viewer'])->assertOk()->assertJsonPath('role', 'viewer');
        $this->putJson("$url/{$member->id}", ['role' => 'owner'])->assertJsonValidationErrors('role');
        $this->putJson("$url/{$this->owner->id}", ['role' => 'viewer'])->assertJsonValidationErrors('role');
    }

    public function test_removing_a_member_unassigns_their_tasks_but_keeps_them(): void
    {
        $member = $this->join(User::factory()->create(), Board::ROLE_MEMBER);
        $task = Task::factory()->create(['board_id' => $this->board->id, 'assigned_to' => $member->id]);

        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/boards/{$this->board->id}/members/{$member->id}")->assertOk();

        $this->assertNull($this->board->roleOf($member));
        $this->assertNull($task->fresh()->assigned_to);
    }

    public function test_a_member_can_leave_but_the_owner_cannot(): void
    {
        $member = $this->join(User::factory()->create(), Board::ROLE_MEMBER);
        $url = "/api/boards/{$this->board->id}/members";

        $this->actingAs($member, 'sanctum')->deleteJson("$url/{$member->id}")->assertOk();
        $this->assertNull($this->board->roleOf($member));

        $this->actingAs($this->owner, 'sanctum')->deleteJson("$url/{$this->owner->id}")
            ->assertJsonValidationErrors('user');
    }

    public function test_removing_someone_who_is_not_a_member_is_404(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/boards/{$this->board->id}/members/".User::factory()->create()->id)
            ->assertNotFound();
    }
}
