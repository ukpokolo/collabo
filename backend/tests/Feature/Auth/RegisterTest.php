<?php

namespace Tests\Feature\Auth;

use App\Mail\OtpMail;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ada Lovelace',
            'email' => 'Ada@Example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ], $overrides);
    }

    public function test_register_creates_unverified_user_and_sends_code_without_token(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', $this->payload());

        $response->assertCreated()->assertJsonMissingPath('token');
        $this->assertDatabaseHas('users', ['email' => 'ada@example.com', 'email_verified_at' => null]);
        Mail::assertSent(OtpMail::class, fn (OtpMail $m) => $m->purpose === OtpCode::PURPOSE_VERIFY_EMAIL
            && $m->hasTo('ada@example.com'));
    }

    public function test_register_stores_a_hashed_password(): void
    {
        Mail::fake();

        $this->postJson('/api/auth/register', $this->payload())->assertCreated();

        $this->assertNotSame('secret123', User::first()->password);
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);

        $this->postJson('/api/auth/register', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_register_rejects_weak_or_unconfirmed_password(): void
    {
        $this->postJson('/api/auth/register', $this->payload(['password' => 'short', 'password_confirmation' => 'short']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/auth/register', $this->payload(['password_confirmation' => 'different1']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/auth/register', $this->payload(['password' => 'onlyletters', 'password_confirmation' => 'onlyletters']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_register_is_rate_limited_per_ip(): void
    {
        Mail::fake();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/register', $this->payload(['email' => "u{$i}@example.com"]))->assertCreated();
        }

        $this->postJson('/api/auth/register', $this->payload(['email' => 'u6@example.com']))
            ->assertStatus(429);
    }
}
