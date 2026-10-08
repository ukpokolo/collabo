<?php

namespace App\Domain\Auth\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent when someone signs up with an address that already has a verified
 * account. The signup response itself reveals nothing; this is how the real
 * owner finds out.
 */
class AccountExistsMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ?string $name = null) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'You already have a Collabo account');
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.account-exists',
            with: [
                'name' => $this->name,
                'loginUrl' => rtrim((string) config('app.frontend_url'), '/').'/login',
                'resetUrl' => rtrim((string) config('app.frontend_url'), '/').'/forgot-password',
            ],
        );
    }
}
