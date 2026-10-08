<?php

namespace App\Domain\Tasks\Mail;

use App\Domain\Tasks\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TaskCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Task $task, public ?string $completedBy = null) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Done: {$this->task->title}");
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.task-completed',
            with: [
                'title' => $this->task->title,
                'boardName' => $this->task->board->name,
                'completedBy' => $this->completedBy,
                'url' => rtrim((string) config('app.frontend_url'), '/').'/tasks/'.$this->task->id,
            ],
        );
    }
}
