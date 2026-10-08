<?php

namespace App\Domain\Features;

use App\Domain\Users\Models\User;
use Closure;
use Illuminate\Support\ServiceProvider;
use Laravel\Pennant\Feature;

class FeatureServiceProvider extends ServiceProvider
{
    /** Scope under which a flag's "for everyone" override is stored. */
    public const GLOBAL_SCOPE = '__global__';

    public function boot(): void
    {
        // Store scopes as the pinned morph alias ('App\Models\User|1'), not the
        // class name, so a future namespace move cannot orphan stored values.
        Feature::useMorphMap();

        foreach (array_keys(config('features', [])) as $name) {
            Feature::define($name, $this->rollout($name));
        }
    }

    /**
     * Resolve a flag for a user: a global override (set by `features:set`) wins,
     * otherwise the config rule. Runs once per user, then Pennant stores it.
     *
     * The override is stored under the string scope GLOBAL_SCOPE. Pennant calls
     * this closure for that scope too when nothing is stored yet; answering
     * null there means "no override".
     */
    private function rollout(string $name): Closure
    {
        return function (mixed $scope) use ($name): ?bool {
            if (! $scope instanceof User) {
                return null;
            }

            $override = Feature::for(self::GLOBAL_SCOPE)->value($name);

            if ($override !== null) {
                return (bool) $override;
            }

            $rule = config("features.{$name}", []);

            if ($rule['enabled'] ?? false) {
                return true;
            }

            if (in_array(strtolower($scope->email), $rule['emails'] ?? [], true)) {
                return true;
            }

            $percentage = max(0, min(100, (int) ($rule['percentage'] ?? 0)));

            // crc32 of flag+user is stable, and differs per flag, so one user is
            // not always in every experiment's first N%.
            return $percentage > 0 && (crc32($name.'|'.$scope->id) % 100) < $percentage;
        };
    }
}
