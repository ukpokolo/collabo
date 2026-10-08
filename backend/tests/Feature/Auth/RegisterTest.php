<?php

namespace Tests\Feature\Auth;

use App\Domain\Auth\Mail\AccountExistsMail;
use App\Domain\Auth\Mail\OtpMail;
use App\Domain\Auth\Models\OtpCode;
use App\Domain\Users\Models\User;
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

    public function test_registering_an_existing_verified_address_looks_identical_but_changes_nothing(): void
    {
        Mail::fake();
        $existing = User::factory()->create(['email' => 'ada@example.com', 'name' => 'Real Ada']);
        $originalHash = $existing->password;

        $fresh = $this->postJson('/api/auth/register', $this->payload(['email' => 'new@example.com']));
        $duplicate = $this->postJson('/api/auth/register', $this->payload(['name' => 'Impostor']));

        // Same status, same body shape: nothing for a stranger to tell the two apart.
        $duplicate->assertCreated();
        $this->assertSame($fresh->status(), $duplicate->status());
        $this->assertSame(array_keys($fresh->json()), array_keys($duplicate->json()));
        $this->assertSame($fresh->json('message'), $duplicate->json('message'));

        // ...and the real account is untouched.
        $this->assertSame(1, User::where('email', 'ada@example.com')->count());
        $this->assertSame('Real Ada', $existing->fresh()->name);
        $this->assertSame($originalHash, $existing->fresh()->password);

        // The owner is told by email instead, and no verification code goes out.
        Mail::assertSent(AccountExistsMail::class, fn (AccountExistsMail $m) => $m->hasTo('ada@example.com'));
        Mail::assertNotSent(OtpMail::class, fn (OtpMail $m) => $m->hasTo('ada@example.com'));
    }

    public function test_registering_an_unverified_address_resends_a_code_without_overwriting_the_account(): void
    {
        Mail::fake();
        $pending = User::factory()->unverified()->create(['email' => 'ada@example.com', 'name' => 'First Try']);
        $originalHash = $pending->password;

        $this->postJson('/api/auth/register', $this->payload(['name' => 'Someone Else']))->assertCreated();

        $this->assertSame(1, User::where('email', 'ada@example.com')->count());
        $this->assertSame('First Try', $pending->fresh()->name);
        $this->assertSame($originalHash, $pending->fresh()->password);
        Mail::assertSent(OtpMail::class, fn (OtpMail $m) => $m->hasTo('ada@example.com'));
        Mail::assertNotSent(AccountExistsMail::class);
    }

    public function test_one_address_cannot_be_mailed_repeatedly_through_register(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'victim@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/register', $this->payload(['email' => 'victim@example.com']))->assertCreated();
        }

        // A different IP, so only the per-address limit can be what stops this.
        $this->withServerVariables(['REMOTE_ADDR' => '10.9.9.9'])
            ->postJson('/api/auth/register', $this->payload(['email' => 'victim@example.com']))
            ->assertStatus(429);

        Mail::assertSent(AccountExistsMail::class, 5);
    }

    public function test_passwords_longer_than_bcrypt_can_use_are_rejected(): void
    {
        $long = str_repeat('a1', 40);

        $this->postJson('/api/auth/register', $this->payload(['password' => $long, 'password_confirmation' => $long]))
            ->assertUnprocessable()->assertJsonValidationErrors('password');
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
