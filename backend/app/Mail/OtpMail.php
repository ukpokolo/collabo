<?php

namespace App\Mail;

use App\Models\OtpCode;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $purpose,
        public ?string $name = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->purpose === OtpCode::PURPOSE_RESET_PASSWORD
                ? 'Reset your Collabo password'
                : 'Verify your Collabo email',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.otp',
            with: [
                'code' => $this->code,
                'name' => $this->name,
                'minutes' => OtpCode::TTL_MINUTES,
                'isReset' => $this->purpose === OtpCode::PURPOSE_RESET_PASSWORD,
            ],
        );
    }
}
