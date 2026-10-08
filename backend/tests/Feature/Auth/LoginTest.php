<?php

namespace Tests\Feature\Auth;

use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_user_receives_a_token(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['user' => ['id', 'name', 'email'], 'token'])
            ->assertJsonMissingPath('user.password');
    }

    public function test_wrong_password_and_unknown_email_return_the_same_error(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);

        $wrongPassword = $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'nope-nope1']);
        $unknownEmail = $this->postJson('/api/auth/login', ['email' => 'ghost@example.com', 'password' => 'nope-nope1']);

        $wrongPassword->assertUnprocessable();
        $unknownEmail->assertUnprocessable();
        $this->assertSame($wrongPassword->json('errors'), $unknownEmail->json('errors'));
    }

    public function test_unverified_user_gets_403_and_a_fresh_code_but_no_token(): void
    {
        Mail::fake();
        User::factory()->unverified()->create(['email' => 'ada@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'password'])
            ->assertForbidden()
            ->assertJsonPath('email_verification_required', true)
            ->assertJsonMissingPath('token');

        Mail::assertSent(OtpMail::class);
    }

    public function test_login_is_rate_limited_per_email_and_ip(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'wrong-pass1'])
                ->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'password'])
            ->assertStatus(429);
    }

    public function test_a_login_lockout_does_not_block_other_auth_endpoints(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'wrong-pass1']);
        }

        // Separate named limiters: exhausting login must not lock out signup.
        Mail::fake();
        $this->postJson('/api/auth/register', [
            'name' => 'Bob', 'email' => 'bob@example.com',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertCreated();
    }

    public function test_token_authenticates_and_logout_revokes_it(): void
    {
        $user = User::factory()->create(['email' => 'ada@example.com']);
        $token = $this->postJson('/api/auth/login', ['email' => 'ada@example.com', 'password' => 'password'])
            ->json('token');

        $this->withToken($token)->getJson('/api/auth/user')->assertOk()->assertJsonPath('id', $user->id);

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_protected_routes_reject_missing_token(): void
    {
        $this->getJson('/api/auth/user')->assertUnauthorized();
        $this->getJson('/api/users')->assertUnauthorized();
        $this->getJson('/api/tasks')->assertUnauthorized();
    }
}
