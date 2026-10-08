<?php

namespace App\Domain\Auth\Services;

use App\Domain\Auth\Mail\OtpMail;
use App\Domain\Auth\Models\OtpCode;
use App\Domain\Users\Models\User;
use Illuminate\Support\Facades\Mail;

class OtpService
{
    public function send(string $email, string $purpose, ?string $name = null): void
    {
        $code = OtpCode::issue($email, $purpose);

        $name ??= User::where('email', $email)->value('name');

        Mail::to($email)->send(new OtpMail($code, $purpose, $name));
    }

    public function verify(string $email, string $code, string $purpose): bool
    {
        return OtpCode::consume($email, $code, $purpose);
    }
}
