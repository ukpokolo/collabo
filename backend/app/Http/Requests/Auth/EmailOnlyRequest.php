<?php

namespace App\Http\Requests\Auth;

use App\Models\OtpCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Used by forgot-password and resend-otp. */
class EmailOnlyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Deliberately NOT `exists:users` — that would turn this endpoint
            // into an account-enumeration oracle.
            'email' => ['required', 'string', 'email'],
            'purpose' => ['sometimes', Rule::in(OtpCode::PURPOSES)],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->email) ? strtolower(trim($this->email)) : $this->email,
        ]);
    }
}
