<?php

namespace Tests\Feature\Boards;

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/**
 * The tasks.board_id migration moves pre-existing data onto a default board.
 * This rolls that one migration back, seeds "old" data, and runs it again.
 */
class BackfillMigrationTest extends TestCase
{
    use DatabaseMigrations;

    private const MIGRATION = 'database/migrations/2026_10_08_000003_add_board_id_to_tasks_table.php';

    private const NOT_NULL_MIGRATION = 'database/migrations/2026_10_08_000004_require_board_id_on_tasks.php';

    private function rollbackBackfill(): void
    {
        // NOT NULL goes first: it depends on the column the backfill adds.
        Artisan::call('migrate:rollback', ['--path' => self::NOT_NULL_MIGRATION, '--realpath' => false]);
        Artisan::call('migrate:rollback', ['--path' => self::MIGRATION, '--realpath' => false]);
    }

    private function runBackfill(): void
    {
        Artisan::call('migrate', ['--path' => self::MIGRATION, '--realpath' => false, '--force' => true]);
    }

    private function user(string $email): int
    {
        return DB::table('users')->insertGetId([
            'name' => $email, 'email' => $email, 'password' => 'x',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_existing_users_and_tasks_land_on_one_default_board(): void
    {
        $this->rollbackBackfill();

        $first = $this->user('a@example.com');
        $second = $this->user('b@example.com');
        $third = $this->user('c@example.com');
        foreach (['One', 'Two'] as $title) {
            DB::table('tasks')->insert(['title' => $title, 'status' => 'todo', 'created_at' => now(), 'updated_at' => now()]);
        }

        $this->runBackfill();

        $board = DB::table('boards')->first();
        $this->assertNotNull($board);
        $this->assertSame(1, DB::table('boards')->count());
        $this->assertSame($first, (int) $board->owner_id);

        $roles = DB::table('board_user')->where('board_id', $board->id)->pluck('role', 'user_id')->all();
        $this->assertSame([$first => 'owner', $second => 'member', $third => 'member'], $roles);

        $this->assertSame(2, DB::table('tasks')->where('board_id', $board->id)->count());
        $this->assertSame(0, DB::table('tasks')->whereNull('board_id')->count());
    }

    public function test_an_empty_database_gets_no_board(): void
    {
        $this->rollbackBackfill();
        $this->runBackfill();

        $this->assertSame(0, DB::table('boards')->count());
    }

    public function test_tasks_without_any_user_abort_the_migration_instead_of_being_orphaned(): void
    {
        $this->rollbackBackfill();
        DB::table('tasks')->insert(['title' => 'Orphan', 'status' => 'todo', 'created_at' => now(), 'updated_at' => now()]);

        $this->expectException(RuntimeException::class);

        $this->withoutMockingConsoleOutput();
        // Artisan::call swallows nothing: the exception propagates from the migration.
        Artisan::call('migrate', ['--path' => self::MIGRATION, '--realpath' => false, '--force' => true]);
    }
}
