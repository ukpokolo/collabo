<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Reads the newest code out of the mail log. Parses the log rather than the
 * database because codes are stored hashed, and this must not change that.
 */
class LatestOtpCommand extends Command
{
    protected $signature = 'otp:latest
                            {email? : Only show codes sent to this address}
                            {--all : List every code in the log, newest first}';

    protected $description = 'Show the latest one-time code from the mail log (local only)';

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->components->error('otp:latest is only available in the local environment.');

            return self::FAILURE;
        }

        if (config('mail.default') !== 'log') {
            $this->components->warn(
                'MAIL_MAILER is "'.config('mail.default').'", not "log" — mail is being delivered for real.'
            );
            $this->line('  Check the recipient\'s inbox (or your Mailtrap inbox) instead.');

            return self::FAILURE;
        }

        $path = storage_path('logs/laravel.log');

        if (! is_readable($path)) {
            $this->components->error('No mail log at '.$path);

            return self::FAILURE;
        }

        $messages = $this->parse(file_get_contents($path));

        if ($email = $this->argument('email')) {
            $messages = array_values(array_filter(
                $messages,
                fn (array $m) => strcasecmp($m['to'], $email) === 0
            ));
        }

        if ($messages === []) {
            $this->components->warn('No codes found in the log yet. Trigger a signup or password reset first.');

            return self::FAILURE;
        }

        if ($this->option('all')) {
            $this->table(
                ['Sent', 'To', 'Subject', 'Code'],
                array_map(fn (array $m) => [$m['sent'], $m['to'], $m['subject'], $m['code']], $messages)
            );

            return self::SUCCESS;
        }

        $latest = $messages[0];

        $this->newLine();
        $this->line('  <fg=gray>To</>       '.$latest['to']);
        $this->line('  <fg=gray>Subject</>  '.$latest['subject']);
        $this->line('  <fg=gray>Sent</>     '.$latest['sent']);
        $this->newLine();
        $this->line('  <bg=magenta;fg=white;options=bold>  '.implode('  ', str_split($latest['code'])).'  </>');
        $this->newLine();
        $this->line('  <fg=gray>Codes expire 10 minutes after they are issued.</>');
        $this->newLine();

        return self::SUCCESS;
    }

    /**
     * Pull {sent, to, subject, code} out of each logged email, newest first.
     *
     * @return list<array{sent: string, to: string, subject: string, code: string}>
     */
    protected function parse(string $log): array
    {
        // Each logged mail starts a new DEBUG entry with a timestamp.
        $chunks = preg_split('/^\[(.+?)\] \w+\.DEBUG: /m', $log, -1, PREG_SPLIT_DELIM_CAPTURE);

        $messages = [];

        for ($i = 1; $i < count($chunks); $i += 2) {
            $timestamp = $chunks[$i];
            $body = $chunks[$i + 1] ?? '';

            if (! preg_match('/^#\s*(\d{6})\s*$/m', $body, $codeMatch)) {
                continue;
            }

            preg_match('/^To:\s*(.+)$/m', $body, $toMatch);
            preg_match('/^Subject:\s*(.+)$/m', $body, $subjectMatch);

            $messages[] = [
                'sent' => $timestamp,
                'to' => trim($toMatch[1] ?? 'unknown'),
                'subject' => trim($subjectMatch[1] ?? 'unknown'),
                'code' => $codeMatch[1],
            ];
        }

        return array_reverse($messages);
    }
}
