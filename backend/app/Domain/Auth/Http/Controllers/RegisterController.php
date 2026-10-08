<?php

namespace App\Domain\Auth\Http\Controllers;

use App\Domain\Auth\Http\Requests\RegisterRequest;
use App\Domain\Auth\Mail\AccountExistsMail;
use App\Domain\Auth\Models\OtpCode;
use App\Domain\Auth\Services\OtpService;
use App\Domain\Users\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class RegisterController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    /**
     * No token is issued until the emailed code is verified.
     *
     * The response is identical whether or not the address already has an
     * account, so this endpoint cannot be used to find out who is registered.
     * What differs goes to the address's owner by email instead.
     */
    public function store(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Hash first in every case: a duplicate would otherwise return visibly
        // faster than a new signup, which is the same leak by timing.
        $passwordHash = Hash::make($data['password']);

        $user = User::where('email', $data['email'])->first();

        if ($user === null) {
            try {
                $user = User::create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => $passwordHash,
                ]);
            } catch (UniqueConstraintViolationException) {
                // Lost a race with a concurrent signup for the same address.
                $user = User::where('email', $data['email'])->firstOrFail();
            }
        }

        if (! $user->email_verified_at) {
            // New, or signed up before and never verified: send a fresh code.
            // An existing account's password is never overwritten from here.
            $this->otp->send($user->email, OtpCode::PURPOSE_VERIFY_EMAIL, $user->name);
        } else {
            Mail::to($user->email)->send(new AccountExistsMail($user->name));
        }

        return response()->json([
            'message' => 'Check your email to finish signing up.',
            'email' => $data['email'],
        ], Response::HTTP_CREATED);
    }
}
