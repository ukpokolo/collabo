<?php

namespace Tests\Feature\Security;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ProxyAndLimitsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TrustProxies::flushState();

        parent::tearDown();
    }

    private function fromIp(string $ip)
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip]);
    }

    public function test_forwarded_headers_are_ignored_unless_proxies_are_trusted(): void
    {
        Route::middleware('api')->get('/api/_ip', fn () => request()->ip());

        $this->fromIp('10.0.0.5')->withHeaders(['X-Forwarded-For' => '203.0.113.9'])
            ->get('/api/_ip')->assertContent('10.0.0.5');
    }

    public function test_the_real_client_ip_is_read_from_a_trusted_proxy(): void
    {
        Route::middleware('api')->get('/api/_ip', fn () => request()->ip());
        TrustProxies::at('*');

        $this->fromIp('10.0.0.5')->withHeaders(['X-Forwarded-For' => '203.0.113.9'])
            ->get('/api/_ip')->assertContent('203.0.113.9');
    }

    public function test_no_proxies_are_trusted_by_default(): void
    {
        // Nothing sits in front of the app locally, so trusting forwarded headers would be a hole.
        $this->assertNull(config('app.trusted_proxies'));
    }

    public function test_login_guessing_is_bounded_per_address_even_when_every_request_claims_a_new_ip(): void
    {
        User::factory()->create(['email' => 'victim@example.com']);

        for ($i = 1; $i <= 20; $i++) {
            $this->fromIp("198.51.100.{$i}")
                ->postJson('/api/auth/login', ['email' => 'victim@example.com', 'password' => 'wrong-pass1'])
                ->assertUnprocessable();
        }

        $this->fromIp('198.51.100.99')
            ->postJson('/api/auth/login', ['email' => 'victim@example.com', 'password' => 'wrong-pass1'])
            ->assertStatus(429);

        // One address being hammered does not lock anyone else out.
        User::factory()->create(['email' => 'bystander@example.com']);
        $this->fromIp('198.51.100.100')
            ->postJson('/api/auth/login', ['email' => 'bystander@example.com', 'password' => 'password'])
            ->assertOk();
    }

    public function test_requesting_codes_is_bounded_per_address_across_ips(): void
    {
        User::factory()->unverified()->create(['email' => 'victim@example.com']);

        for ($i = 1; $i <= 10; $i++) {
            $this->fromIp("198.51.100.{$i}")->postJson('/api/auth/resend-otp', ['email' => 'victim@example.com'])->assertOk();
        }

        $this->fromIp('198.51.100.99')->postJson('/api/auth/resend-otp', ['email' => 'victim@example.com'])
            ->assertStatus(429);
    }

    public function test_guessing_codes_is_bounded_per_address_across_ips(): void
    {
        User::factory()->unverified()->create(['email' => 'victim@example.com']);

        for ($i = 1; $i <= 30; $i++) {
            $this->fromIp("198.51.100.{$i}")
                ->postJson('/api/auth/verify-email', ['email' => 'victim@example.com', 'code' => '000000']);
        }

        $this->fromIp('198.51.100.99')
            ->postJson('/api/auth/verify-email', ['email' => 'victim@example.com', 'code' => '000000'])
            ->assertStatus(429);
    }

    public function test_the_address_is_matched_case_insensitively_so_capitals_cannot_dodge_the_limit(): void
    {
        User::factory()->create(['email' => 'victim@example.com']);

        for ($i = 1; $i <= 20; $i++) {
            $this->fromIp("198.51.100.{$i}")
                ->postJson('/api/auth/login', ['email' => $i % 2 ? 'VICTIM@example.com' : 'victim@EXAMPLE.com', 'password' => 'wrong-pass1']);
        }

        $this->fromIp('198.51.100.99')
            ->postJson('/api/auth/login', ['email' => 'Victim@Example.com', 'password' => 'wrong-pass1'])
            ->assertStatus(429);
    }
}
