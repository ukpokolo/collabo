<?php

namespace Tests\Feature\Auth;

use App\Domain\Auth\Mail\OtpMail;
use App\Domain\Auth\Models\OtpCode;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_never_reveals_whether_an_email_exists(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'ada@example.com']);

        $known = $this->postJson('/api/auth/forgot-password', ['email' => 'ada@example.com']);
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'ghost@example.com']);

        $this->assertSame($known->json(), $unknown->json());
        Mail::assertSent(OtpMail::class, fn (OtpMail $m) => $m->purpose === OtpCode::PURPOSE_RESET_PASSWORD);
        Mail::assertSent(OtpMail::class, 1);
    }

    public function test_reset_changes_the_password_and_revokes_existing_tokens(): void
    {
        $user = User::factory()->create(['email' => 'ada@example.com']);
        $user->createToken('collabo');
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_RESET_PASSWORD);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'ada@example.com', 'code' => $code,
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertOk();

        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_reset_with_a_wrong_code_leaves_the_password_alone(): void
    {
        $user = User::factory()->create(['email' => 'ada@example.com']);
        $code = OtpCode::issue('ada@example.com', OtpCode::PURPOSE_RESET_PASSWORD);
        $wrong = $code === '000000' ? '111111' : '000000';

        $this->postJson('/api/auth/reset-password', [
            'email' => 'ada@example.com', 'code' => $wrong,
            'password' => 'newpass123', 'password_confirmation' => 'newpass123',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }
}
