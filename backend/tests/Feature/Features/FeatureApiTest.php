<?php

namespace Tests\Feature\Features;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Pennant\Feature;
use Tests\TestCase;

class FeatureApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/features')->assertUnauthorized();
    }

    public function test_returns_every_defined_flag_as_a_boolean_defaulting_to_off(): void
    {
        $response = $this->actingAs(User::factory()->create(), 'sanctum')->getJson('/api/features')->assertOk();

        $this->assertEqualsCanonicalizing(array_keys(config('features')), array_keys($response->json()));
        foreach ($response->json() as $name => $value) {
            $this->assertFalse($value, "{$name} should default to off");
        }
    }

    public function test_a_flag_turned_on_for_one_user_does_not_leak_to_another(): void
    {
        $ada = User::factory()->create();
        $bob = User::factory()->create();
        Feature::for($ada)->activate('list-view');

        $this->actingAs($ada, 'sanctum')->getJson('/api/features')->assertJsonPath('list-view', true);
        $this->actingAs($bob, 'sanctum')->getJson('/api/features')->assertJsonPath('list-view', false);
    }

    public function test_scopes_are_stored_with_the_pinned_morph_alias_not_the_class_name(): void
    {
        $user = User::factory()->create();
        Feature::for($user)->activate('list-view');

        $this->assertDatabaseHas('features', ['name' => 'list-view', 'scope' => "App\\Models\\User|{$user->id}"]);
    }
}
