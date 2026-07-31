<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\EmailOnlyRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    /** Always 200, even for unknown addresses, to avoid account enumeration. */
    public function sendCode(EmailOnlyRequest $request): JsonResponse
    {
        $email = $request->validated()['email'];

        if ($user = User::where('email', $email)->first()) {
            $this->otp->send($user->email, OtpCode::PURPOSE_RESET_PASSWORD, $user->name);
        }

        return response()->json([
            'message' => 'If that email is registered, a reset code is on its way.',
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! $this->otp->verify($data['email'], $data['code'], OtpCode::PURPOSE_RESET_PASSWORD)) {
            throw ValidationException::withMessages([
                'code' => 'That code is invalid or has expired.',
            ]);
        }

        $user = User::where('email', $data['email'])->firstOrFail();

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        // A reset may mean the account was compromised, so drop every token.
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password updated. Please sign in.',
        ]);
    }
}
