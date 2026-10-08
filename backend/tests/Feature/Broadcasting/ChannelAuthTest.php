<?php

namespace Tests\Feature\Broadcasting;

use App\Events\TaskUpdated;
use App\Models\Task;
use App\Models\User;
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

    public function test_anonymous_requests_cannot_authorize_a_channel(): void
    {
        $this->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'private-board.1'])
            ->assertUnauthorized();
    }

    public function test_a_bearer_token_user_can_join_the_private_board_channel(): void
    {
        $token = User::factory()->create()->createToken('t')->plainTextToken;

        $this->withToken($token)
            ->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'private-board.1'])
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_a_bearer_token_user_can_join_the_presence_channel_with_their_identity(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'presence-board.1'])
            ->assertOk();

        $info = json_decode($response->json('channel_data'), true);
        $this->assertEquals($user->id, $info['user_id']);
        $this->assertSame($user->name, $info['user_info']['name']);
    }

    public function test_task_events_go_to_the_private_board_channel(): void
    {
        $event = new TaskUpdated(Task::factory()->make(), 'updated');

        $this->assertSame(['private-board.1'], array_map(fn ($c) => $c->name, $event->broadcastOn()));
        $this->assertSame('task.updated', $event->broadcastAs());
    }
}
