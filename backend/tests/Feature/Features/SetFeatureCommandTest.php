<?php

namespace Tests\Feature\Features;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Pennant\Feature;
use Tests\TestCase;

class SetFeatureCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_on_and_off_apply_to_everyone_including_users_already_resolved(): void
    {
        $user = User::factory()->create();
        $this->assertFalse(Feature::for($user)->active('list-view'));

        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'on'])->assertSuccessful();
        Feature::flushCache();
        $this->assertTrue(Feature::for($user)->active('list-view'));
        $this->assertTrue(Feature::for(User::factory()->create())->active('list-view'));

        // The kill switch: off wins even over a stored "on".
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'off'])->assertSuccessful();
        Feature::flushCache();
        $this->assertFalse(Feature::for($user)->active('list-view'));
    }

    public function test_a_single_user_can_be_targeted_by_email(): void
    {
        $ada = User::factory()->create(['email' => 'ada@example.com']);
        $bob = User::factory()->create();

        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'on', '--user' => 'ADA@example.com'])->assertSuccessful();
        Feature::flushCache();

        $this->assertTrue(Feature::for($ada)->active('list-view'));
        $this->assertFalse(Feature::for($bob)->active('list-view'));
    }

    public function test_default_forgets_stored_values_so_the_rule_applies_again(): void
    {
        $user = User::factory()->create();
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'on'])->assertSuccessful();

        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'default'])->assertSuccessful();
        Feature::flushCache();

        $this->assertFalse(Feature::for($user)->active('list-view'));
    }

    public function test_rejects_unknown_flags_states_and_users(): void
    {
        $this->artisan('features:set', ['flag' => 'nope', 'state' => 'on'])->assertFailed();
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'maybe'])->assertFailed();
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'on', '--user' => 'ghost@example.com'])->assertFailed();
    }

    public function test_the_kill_switch_also_covers_users_who_have_never_been_resolved(): void
    {
        config(['features.list-view' => ['enabled' => true, 'percentage' => 0, 'emails' => []]]);
        $existing = User::factory()->create();
        $this->assertTrue(Feature::for($existing)->active('list-view'));

        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'off'])->assertSuccessful();
        Feature::flushCache();

        // Someone who signs up after the switch is thrown must not get the feature
        // just because the rule says "enabled".
        $this->assertFalse(Feature::for($existing)->active('list-view'));
        $this->assertFalse(Feature::for(User::factory()->create())->active('list-view'));
    }

    public function test_forcing_on_covers_future_users_even_when_the_rule_is_off(): void
    {
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'on'])->assertSuccessful();
        Feature::flushCache();

        $this->assertTrue(Feature::for(User::factory()->create())->active('list-view'));
    }

    public function test_default_removes_the_override_so_the_rule_applies_to_everyone_again(): void
    {
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'on'])->assertSuccessful();
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'default'])->assertSuccessful();
        Feature::flushCache();

        $this->assertFalse(Feature::for(User::factory()->create())->active('list-view'));
        $this->assertDatabaseMissing('features', ['name' => 'list-view', 'scope' => '__global__', 'value' => 'true']);
    }

    public function test_a_per_user_setting_is_independent_of_the_global_one(): void
    {
        $ada = User::factory()->create(['email' => 'ada@example.com']);
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'off'])->assertSuccessful();
        $this->artisan('features:set', ['flag' => 'list-view', 'state' => 'on', '--user' => 'ada@example.com'])->assertSuccessful();
        Feature::flushCache();

        $this->assertTrue(Feature::for($ada)->active('list-view'));
        $this->assertFalse(Feature::for(User::factory()->create())->active('list-view'));
    }
}
