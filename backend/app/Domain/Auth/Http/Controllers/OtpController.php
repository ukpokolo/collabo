<?php

namespace App\Domain\Auth\Http\Controllers;

use App\Domain\Auth\Http\Requests\EmailOnlyRequest;
use App\Domain\Auth\Http\Requests\OtpRequest;
use App\Domain\Auth\Models\OtpCode;
use App\Domain\Auth\Services\OtpService;
use App\Domain\Boards\Services\BoardService;
use App\Domain\Users\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OtpController extends Controller
{
    public function __construct(
        private readonly OtpService $otp,
        private readonly BoardService $boards,
    ) {}

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

            // First verification: give them somewhere to land.
            $this->boards->createFor($user, Str::limit($user->name, 60, '')."'s board");
        }

        return response()->json([
            'user' => $user->only('id', 'name', 'email'),
            'token' => $user->issueToken(),
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
