<?php

namespace Tests\Feature\Security;

use App\Domain\Users\Models\User;
use App\Logging\AddUserContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\StreamHandler;
use Tests\TestCase;

class RequestContextTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_response_carries_a_request_id(): void
    {
        $id = $this->getJson('/api/boards')->assertUnauthorized()->headers->get('X-Request-Id');

        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $id);
        $this->assertNotSame($id, $this->getJson('/api/boards')->headers->get('X-Request-Id'), 'each request gets its own');
    }

    public function test_a_sane_incoming_id_is_kept_so_it_can_follow_a_request_across_services(): void
    {
        $this->withHeaders(['X-Request-Id' => 'edge-7f3a9c21-b'])->getJson('/api/boards')
            ->assertHeader('X-Request-Id', 'edge-7f3a9c21-b');
    }

    public function test_an_unsafe_incoming_id_is_replaced_not_echoed_or_logged(): void
    {
        foreach (["abc\ndef-forged-line-0001", str_repeat('a', 65), 'short', '<script>alert(1)</script>'] as $hostile) {
            $id = $this->withHeaders(['X-Request-Id' => $hostile])->getJson('/api/boards')->headers->get('X-Request-Id');

            $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $id);
        }
    }

    public function test_a_log_line_from_an_authenticated_request_is_json_with_the_request_id_and_user(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'collabo-log');
        config([
            'logging.default' => 'jsonfile',
            'logging.channels.jsonfile' => [
                'driver' => 'monolog',
                'handler' => StreamHandler::class,
                'handler_with' => ['stream' => $file],
                'formatter' => JsonFormatter::class,
                'tap' => [AddUserContext::class],
            ],
        ]);
        Log::forgetChannel('jsonfile');

        Route::middleware('auth:sanctum')->get('/api/_log', function () {
            Log::info('inside a request');

            return 'ok';
        });
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->withHeaders(['X-Request-Id' => 'trace-me-12345678'])
            ->getJson('/api/_log')->assertOk();

        $lines = array_filter(explode("\n", (string) file_get_contents($file)));
        @unlink($file);
        $entry = collect($lines)->map(fn ($l) => json_decode($l, true))->firstWhere('message', 'inside a request');

        $this->assertNotNull($entry, 'the log line is valid JSON');
        $this->assertSame('trace-me-12345678', $entry['extra']['request_id'] ?? null);
        $this->assertSame($user->id, $entry['extra']['user_id'] ?? null);
    }

    public function test_a_log_line_with_no_signed_in_user_has_no_user_id(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'collabo-log');
        config([
            'logging.default' => 'jsonfile',
            'logging.channels.jsonfile' => [
                'driver' => 'monolog',
                'handler' => StreamHandler::class,
                'handler_with' => ['stream' => $file],
                'formatter' => JsonFormatter::class,
                'tap' => [AddUserContext::class],
            ],
        ]);
        Log::forgetChannel('jsonfile');

        Route::get('/api/_anon', function () {
            Log::info('anonymous');

            return 'ok';
        });

        $this->getJson('/api/_anon')->assertOk();

        $entry = collect(array_filter(explode("\n", (string) file_get_contents($file))))
            ->map(fn ($l) => json_decode($l, true))->firstWhere('message', 'anonymous');
        @unlink($file);

        $this->assertNotNull($entry);
        $this->assertArrayNotHasKey('user_id', $entry['extra'] ?? []);
        $this->assertArrayHasKey('request_id', $entry['extra']);
    }

    public function test_the_channels_a_deployment_writes_to_all_stamp_the_user(): void
    {
        foreach (['single', 'daily', 'stderr'] as $channel) {
            $this->assertContains(AddUserContext::class, config("logging.channels.{$channel}.tap"), "{$channel} must tap AddUserContext");
        }
    }
}
