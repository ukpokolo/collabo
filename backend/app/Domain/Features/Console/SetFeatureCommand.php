<?php

namespace App\Domain\Features\Console;

use App\Domain\Features\FeatureServiceProvider;
use App\Domain\Users\Models\User;
use Illuminate\Console\Command;
use Laravel\Pennant\Feature;

class SetFeatureCommand extends Command
{
    protected $signature = 'features:set
                            {flag : A flag defined in config/features.php}
                            {state : on, off, or default (forget stored values and re-resolve from the config rule)}
                            {--user= : Only this user (email); omit to apply to everyone}';

    protected $description = 'Turn a feature flag on or off, for everyone or one user. This is the kill switch.';

    public function handle(): int
    {
        $flag = $this->argument('flag');
        $state = $this->argument('state');

        if (! in_array($flag, Feature::defined(), true)) {
            $this->components->error("Unknown flag \"{$flag}\". Defined: ".implode(', ', Feature::defined()));

            return self::FAILURE;
        }

        if (! in_array($state, ['on', 'off', 'default'], true)) {
            $this->components->error('State must be on, off or default.');

            return self::FAILURE;
        }

        $user = null;

        if ($email = $this->option('user')) {
            $user = User::where('email', strtolower($email))->first();

            if (! $user) {
                $this->components->error("No user with email {$email}.");

                return self::FAILURE;
            }
        }

        match (true) {
            $state === 'on' && $user !== null => Feature::for($user)->activate($flag),
            $state === 'on' => $this->setForEveryone($flag, true),
            $state === 'off' && $user !== null => Feature::for($user)->deactivate($flag),
            $state === 'off' => $this->setForEveryone($flag, false),
            $user !== null => Feature::for($user)->forget($flag),
            default => Feature::purge($flag),
        };

        $this->components->info("{$flag} → {$state} for ".($user ? $user->email : 'everyone').'.');

        return self::SUCCESS;
    }

    /**
     * Pennant's *ForEveryone only rewrites rows that already exist, so people
     * who have not been resolved yet would fall back to the config rule, and a
     * kill switch must cover them too. The global override row handles them;
     * the second call fixes everyone already stored.
     */
    private function setForEveryone(string $flag, bool $value): void
    {
        $value
            ? Feature::for(FeatureServiceProvider::GLOBAL_SCOPE)->activate($flag)
            : Feature::for(FeatureServiceProvider::GLOBAL_SCOPE)->deactivate($flag);

        Feature::activateForEveryone($flag, $value);
    }
}
