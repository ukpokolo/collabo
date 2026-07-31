<?php

namespace App\Services;

use App\Mail\OtpMail;
use App\Models\OtpCode;
use App\Models\User;
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
