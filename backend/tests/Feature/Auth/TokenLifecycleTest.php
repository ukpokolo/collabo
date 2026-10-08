<?php

namespace Tests\Feature\Auth;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function login(User $user): string
    {
        return $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()->json('token');
    }

    public function test_tokens_expire_after_the_configured_lifetime(): void
    {
        config(['sanctum.expiration' => 60]);
        $user = User::factory()->create();
        $token = $this->login($user);

        $this->withToken($token)->getJson('/api/auth/user')->assertOk();

        $this->travel(61)->minutes();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/auth/user')->assertUnauthorized();
    }

    public function test_the_default_lifetime_is_finite(): void
    {
        $this->assertGreaterThan(0, config('sanctum.expiration'));
        $this->assertSame([], config('sanctum.stateful'), 'Bearer-only API: no cookie/session domains');
    }

    public function test_signing_in_removes_that_users_expired_tokens_but_not_other_peoples(): void
    {
        config(['sanctum.expiration' => 60]);
        $user = User::factory()->create();
        $other = User::factory()->create();
        $user->createToken('old');
        $other->createToken('old');

        $this->travel(120)->minutes();
        $this->login($user);

        $this->assertSame(1, $user->tokens()->count(), 'the expired one is gone, the new one remains');
        $this->assertSame(1, $other->tokens()->count(), "someone else's expired token is not touched by this sign-in");
    }

    public function test_an_account_keeps_a_bounded_number_of_tokens(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < User::MAX_TOKENS + 5; $i++) {
            $user->issueToken();
        }

        $this->assertSame(User::MAX_TOKENS, $user->tokens()->count());
    }

    public function test_the_newest_token_survives_the_cap(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < User::MAX_TOKENS + 3; $i++) {
            $latest = $user->issueToken();
        }

        $this->withToken($latest)->getJson('/api/auth/user')->assertOk();
    }
}
