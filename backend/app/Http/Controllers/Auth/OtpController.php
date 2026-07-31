<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\EmailOnlyRequest;
use App\Http\Requests\Auth\OtpRequest;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class OtpController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    public function verifyEmail(OtpRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! $this->otp->verify($data['email'], $data['code'], OtpCode::PURPOSE_VERIFY_EMAIL)) {
            throw ValidationException::withMessages([
                'code' => 'That code is invalid or has expired.',
            ]);
        }

        $user = User::where('email', $data['email'])->firstOrFail();

        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return response()->json([
            'user' => $user->only('id', 'name', 'email'),
            'token' => $user->createToken('collabo')->plainTextToken,
        ]);
    }

    /** Always 200, even for unknown addresses, to avoid account enumeration. */
    public function resend(EmailOnlyRequest $request): JsonResponse
    {
        $data = $request->validated();
        $purpose = $data['purpose'] ?? OtpCode::PURPOSE_VERIFY_EMAIL;

        $user = User::where('email', $data['email'])->first();

        $alreadyVerified = $purpose === OtpCode::PURPOSE_VERIFY_EMAIL && $user?->email_verified_at;

        if ($user && ! $alreadyVerified) {
            $this->otp->send($user->email, $purpose, $user->name);
        }

        return response()->json([
            'message' => 'If that email is registered, a new code is on its way.',
        ], Response::HTTP_OK);
    }
}
