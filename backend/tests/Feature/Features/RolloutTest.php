<?php

namespace Tests\Feature\Features;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Pennant\Feature;
use Tests\TestCase;

class RolloutTest extends TestCase
{
    use RefreshDatabase;

    private function rule(array $rule): void
    {
        config(['features.list-view' => $rule + ['enabled' => false, 'percentage' => 0, 'emails' => []]]);
        Feature::flushCache();
    }

    public function test_enabled_turns_it_on_for_everyone(): void
    {
        $this->rule(['enabled' => true]);

        $this->assertTrue(Feature::for(User::factory()->create())->active('list-view'));
    }

    public function test_an_email_allowlist_turns_it_on_for_just_those_users(): void
    {
        $this->rule(['emails' => ['vip@example.com']]);

        $this->assertTrue(Feature::for(User::factory()->create(['email' => 'VIP@example.com']))->active('list-view'));
        $this->assertFalse(Feature::for(User::factory()->create(['email' => 'other@example.com']))->active('list-view'));
    }

    public function test_a_percentage_rollout_is_stable_per_user_and_roughly_proportional(): void
    {
        $this->rule(['percentage' => 30]);
        $users = User::factory()->count(200)->create();

        $first = $users->map(fn ($user) => Feature::for($user)->active('list-view'));
        Feature::flushCache();
        $second = $users->map(fn ($user) => Feature::for($user)->active('list-view'));

        $this->assertEquals($first->all(), $second->all(), 'a user must not flip between requests');
        $share = $first->filter()->count() / 200;
        $this->assertGreaterThan(0.18, $share);
        $this->assertLessThan(0.42, $share);
    }

    public function test_zero_and_hundred_percent_are_exact(): void
    {
        $users = User::factory()->count(20)->create();

        $this->rule(['percentage' => 0]);
        $this->assertSame(0, $users->filter(fn ($user) => Feature::for($user)->active('list-view'))->count());

        $this->rule(['percentage' => 100]);
        Feature::purge('list-view');
        $this->assertSame(20, $users->filter(fn ($user) => Feature::for($user)->active('list-view'))->count());
    }

    public function test_a_resolved_value_is_sticky_until_purged(): void
    {
        $user = User::factory()->create();
        $this->rule(['enabled' => true]);
        $this->assertTrue(Feature::for($user)->active('list-view'));

        // Editing the rule later does not change someone already resolved...
        $this->rule(['enabled' => false]);
        $this->assertTrue(Feature::for($user)->active('list-view'));

        // ...until the flag is reset (what `features:set <flag> default` does).
        Feature::purge('list-view');
        Feature::flushCache();
        $this->assertFalse(Feature::for($user)->active('list-view'));
    }
}
