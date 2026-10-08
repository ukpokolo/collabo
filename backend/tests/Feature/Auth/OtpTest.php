<?php

namespace Tests\Feature\Auth;

use App\Domain\Auth\Mail\OtpMail;
use App\Domain\Auth\Models\OtpCode;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_correct_code_verifies_email_and_issues_a_token(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'ada@example.com']);
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);

        $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => $code])
            ->assertOk()
            ->assertJsonStructure(['user', 'token']);

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_first_verification_creates_the_users_own_board(): void
    {
        $user = User::factory()->unverified()->create(['name' => 'Ada Lovelace', 'email' => 'ada@example.com']);
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);

        $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => $code])->assertOk();

        $board = $user->boards()->first();
        $this->assertNotNull($board);
        $this->assertSame("Ada Lovelace's board", $board->name);
        $this->assertSame('owner', $board->pivot->role);
    }

    public function test_verifying_again_does_not_create_another_board(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'ada@example.com']);

        foreach ([1, 2] as $_) {
            $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);
            $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => $code])->assertOk();
        }

        $this->assertSame(1, $user->boards()->count());
    }

    public function test_code_is_single_use(): void
    {
        User::factory()->unverified()->create(['email' => 'ada@example.com']);
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);

        $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => $code])->assertOk();
        $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => $code])
            ->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_expired_code_is_rejected(): void
    {
        User::factory()->unverified()->create(['email' => 'ada@example.com']);
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);

        $this->travel(OtpCode::TTL_MINUTES + 1)->minutes();

        $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => $code])
            ->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_code_locks_after_max_wrong_attempts_even_if_later_correct(): void
    {
        User::factory()->unverified()->create(['email' => 'ada@example.com']);
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);
        $wrong = $code === '000000' ? '111111' : '000000';

        for ($i = 0; $i < OtpCode::MAX_ATTEMPTS; $i++) {
            $this->assertFalse(OtpCode::consume('ada@example.com', $wrong, OtpCode::PURPOSE_VERIFY_EMAIL));
        }

        $this->assertFalse(OtpCode::consume('ada@example.com', $code, OtpCode::PURPOSE_VERIFY_EMAIL));
    }

    public function test_code_is_stored_hashed_and_issuing_invalidates_the_previous_one(): void
    {
        $first = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);
        $this->assertDatabaseMissing('otp_codes', ['code_hash' => $first]);

        $second = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);

        if ($first !== $second) {
            $this->assertFalse(OtpCode::consume('ada@example.com', $first, OtpCode::PURPOSE_VERIFY_EMAIL));
        }
        $this->assertTrue(OtpCode::consume('ada@example.com', $second, OtpCode::PURPOSE_VERIFY_EMAIL));
    }

    public function test_a_code_for_one_purpose_does_not_work_for_another(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_VERIFY_EMAIL);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'ada@example.com', 'code' => $code,
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_resend_never_reveals_whether_an_email_exists(): void
    {
        Mail::fake();
        User::factory()->unverified()->create(['email' => 'ada@example.com']);

        $known = $this->postJson('/api/auth/resend-otp', ['email' => 'ada@example.com']);
        $unknown = $this->postJson('/api/auth/resend-otp', ['email' => 'ghost@example.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json(), $unknown->json());
        Mail::assertSent(OtpMail::class, 1);
    }

    public function test_verify_endpoint_is_rate_limited(): void
    {
        User::factory()->unverified()->create(['email' => 'ada@example.com']);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => '000000']);
        }

        $this->postJson('/api/auth/verify-email', ['email' => 'ada@example.com', 'code' => '000000'])
            ->assertStatus(429);
    }
}
