<?php

namespace Tests\Feature\Broadcasting;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Events\TaskUpdated;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChannelAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The null driver skips channel auth entirely, so use reverb with
        // throwaway credentials. Signing a response never opens a connection.
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);

        // Channels were registered on the null broadcaster at boot; register
        // them again on the reverb one that is now the default.
        require base_path('routes/channels.php');
    }

    private function join(string $channel, User $user)
    {
        return $this->withToken($user->createToken('t')->plainTextToken)
            ->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => $channel]);
    }

    public function test_anonymous_requests_cannot_authorize_a_channel(): void
    {
        $this->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'private-board.1'])
            ->assertUnauthorized();
    }

    public function test_a_board_member_can_join_its_private_channel_with_a_bearer_token(): void
    {
        $board = Board::factory()->withOwnerMember()->create();

        $this->join("private-board.{$board->id}", $board->owner)->assertOk()->assertJsonStructure(['auth']);
    }

    public function test_a_viewer_can_join_to_receive_updates(): void
    {
        $board = Board::factory()->withOwnerMember()->create();
        $viewer = User::factory()->create();
        $board->members()->attach($viewer->id, ['role' => Board::ROLE_VIEWER]);

        $this->join("private-board.{$board->id}", $viewer)->assertOk();
    }

    public function test_a_non_member_cannot_join_a_board_channel(): void
    {
        $board = Board::factory()->withOwnerMember()->create();
        $outsider = User::factory()->create();

        $this->join("private-board.{$board->id}", $outsider)->assertForbidden();
        $this->join("presence-board.{$board->id}", $outsider)->assertForbidden();
    }

    public function test_a_nonexistent_board_channel_is_refused(): void
    {
        $this->join('private-board.999999', User::factory()->create())->assertForbidden();
    }

    public function test_membership_in_one_board_does_not_open_another(): void
    {
        $mine = Board::factory()->withOwnerMember()->create();
        $theirs = Board::factory()->withOwnerMember()->create();

        $this->join("private-board.{$mine->id}", $mine->owner)->assertOk();
        $this->join("private-board.{$theirs->id}", $mine->owner)->assertForbidden();
    }

    public function test_a_member_can_join_the_presence_channel_with_their_identity(): void
    {
        $board = Board::factory()->withOwnerMember()->create();

        $response = $this->join("presence-board.{$board->id}", $board->owner)->assertOk();

        $info = json_decode($response->json('channel_data'), true);
        $this->assertEquals($board->owner->id, $info['user_id']);
        $this->assertSame($board->owner->name, $info['user_info']['name']);
    }

    public function test_task_events_go_to_their_boards_private_channel(): void
    {
        $task = Task::factory()->make();
        $event = new TaskUpdated($task, 'updated', 42);

        $this->assertSame(['private-board.42'], array_map(fn ($c) => $c->name, $event->broadcastOn()));
        $this->assertSame('task.updated', $event->broadcastAs());
    }
}
