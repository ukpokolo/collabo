<?php

namespace App\Http\Requests\Auth;

use App\Models\OtpCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Shared shape for "here is an email and a 6-digit code". */
class OtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'code' => ['required', 'string', 'digits:6'],
            'purpose' => ['sometimes', Rule::in(OtpCode::PURPOSES)],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => is_string($this->email) ? strtolower(trim($this->email)) : $this->email,
            'code' => is_string($this->code) ? trim($this->code) : $this->code,
        ]);
    }
}
