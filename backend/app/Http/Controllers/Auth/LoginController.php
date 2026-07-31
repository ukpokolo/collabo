<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    public function store(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->first();

        // One identical error for "no such user" and "wrong password" — a
        // distinct message for each would confirm which emails are registered.
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->email_verified_at) {
            // Password was right, so re-sending the code here is safe and
            // saves the user a round trip.
            $this->otp->send($user->email, OtpCode::PURPOSE_VERIFY_EMAIL, $user->name);

            return response()->json([
                'message' => 'Your email is not verified yet. We just sent you a new code.',
                'email_verification_required' => true,
                'email' => $user->email,
            ], Response::HTTP_FORBIDDEN);
        }

        return response()->json([
            'user' => $user->only('id', 'name', 'email'),
            'token' => $user->createToken('collabo')->plainTextToken,
        ]);
    }

    /** Revoke only the token that made this request, not every session. */
    public function destroy(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->only('id', 'name', 'email'));
    }
}
