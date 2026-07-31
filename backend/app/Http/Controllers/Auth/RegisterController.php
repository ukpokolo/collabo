<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    /** No token is issued until the emailed code is verified. */
    public function store(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        $this->otp->send($user->email, OtpCode::PURPOSE_VERIFY_EMAIL, $user->name);

        return response()->json([
            'message' => 'Account created. Check your email for a 6-digit verification code.',
            'email' => $user->email,
        ], Response::HTTP_CREATED);
    }
}
