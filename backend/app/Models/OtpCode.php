<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class OtpCode extends Model
{
    public const PURPOSE_VERIFY_EMAIL = 'verify_email';
    public const PURPOSE_RESET_PASSWORD = 'reset_password';

    public const PURPOSES = [
        self::PURPOSE_VERIFY_EMAIL,
        self::PURPOSE_RESET_PASSWORD,
    ];

    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    protected $fillable = [
        'email',
        'code_hash',
        'purpose',
        'attempts',
        'expires_at',
        'consumed_at',
    ];

    protected $hidden = [
        'code_hash',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /**
     * Issue a code, invalidating any outstanding one for this email/purpose.
     *
     * Returns the plaintext code. Hand it straight to the mailer: it is never
     * persisted or logged in the clear.
     */
    public static function issue(string $email, string $purpose): string
    {
        static::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        static::create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        return $code;
    }

    public static function consume(string $email, string $code, string $purpose): bool
    {
        $record = static::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $record || $record->isExpired() || $record->attempts >= self::MAX_ATTEMPTS) {
            return false;
        }

        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');

            return false;
        }

        $record->update(['consumed_at' => now()]);

        return true;
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
