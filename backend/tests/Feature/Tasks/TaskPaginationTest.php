<?php

namespace Tests\Feature\Tasks;

use App\Domain\Boards\Models\Board;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TaskPaginationTest extends TestCase
{
    use RefreshDatabase;

    private Board $board;

    protected function setUp(): void
    {
        parent::setUp();

        $this->board = Board::factory()->withOwnerMember()->create();
        $this->actingAs($this->board->owner, 'sanctum');
    }

    private function url(string $query = ''): string
    {
        return "/api/boards/{$this->board->id}/tasks".$query;
    }

    /** Walk every page and return [ids in order seen, number of requests]. */
    private function walk(string $extra = '', int $limit = 2): array
    {
        $ids = [];
        $requests = 0;
        $cursor = null;

        do {
            $query = "?limit={$limit}{$extra}".($cursor ? '&cursor='.urlencode($cursor) : '');
            $response = $this->getJson($this->url($query))->assertOk();
            $requests++;
            array_push($ids, ...array_column($response->json('data'), 'id'));
            $cursor = $response->json('next_cursor');
            $this->assertSame($cursor !== null, $response->json('has_more'), 'has_more must agree with next_cursor');
        } while ($cursor && $requests < 50);

        return [$ids, $requests];
    }

    public function test_a_small_board_comes_back_in_one_page(): void
    {
        Task::factory()->count(3)->create(['board_id' => $this->board->id]);

        $this->getJson($this->url())->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('next_cursor', null)
            ->assertJsonPath('has_more', false);
    }

    public function test_pages_cover_every_task_exactly_once_newest_id_first(): void
    {
        $created = Task::factory()->count(5)->create(['board_id' => $this->board->id])->pluck('id')->all();

        [$ids, $requests] = $this->walk();

        $this->assertSame(array_reverse($created), $ids);
        $this->assertSame(3, $requests);
    }

    public function test_editing_a_task_while_paging_cannot_make_it_skipped_or_repeated(): void
    {
        $tasks = Task::factory()->count(6)->create(['board_id' => $this->board->id]);

        $first = $this->getJson($this->url('?limit=2'))->assertOk();
        // An edit between page 1 and page 2: this would reorder a list sorted by
        // updated_at, and push an unseen task to the front, past the cursor.
        $this->travel(5)->minutes();
        $tasks->first()->update(['title' => 'edited mid-load']);

        $second = $this->getJson($this->url('?limit=2&cursor='.urlencode($first->json('next_cursor'))))->assertOk();
        $third = $this->getJson($this->url('?limit=2&cursor='.urlencode($second->json('next_cursor'))))->assertOk();

        $seen = array_merge(
            array_column($first->json('data'), 'id'),
            array_column($second->json('data'), 'id'),
            array_column($third->json('data'), 'id'),
        );
        $this->assertCount(6, $seen);
        $this->assertCount(6, array_unique($seen));
    }

    public function test_filters_hold_across_pages(): void
    {
        Task::factory()->count(5)->create(['board_id' => $this->board->id, 'status' => Task::STATUS_DONE]);
        Task::factory()->count(4)->create(['board_id' => $this->board->id, 'status' => Task::STATUS_TODO]);

        [$ids] = $this->walk('&status=done');

        $this->assertCount(5, $ids);
        $this->assertSame(5, Task::whereIn('id', $ids)->where('status', Task::STATUS_DONE)->count());
    }

    public function test_pages_never_leak_another_boards_tasks(): void
    {
        Task::factory()->count(3)->create(['board_id' => $this->board->id]);
        Task::factory()->count(4)->create();

        [$ids] = $this->walk();

        $this->assertCount(3, $ids);
    }

    public function test_limit_is_validated_and_bounded(): void
    {
        $this->getJson($this->url('?limit=0'))->assertJsonValidationErrors('limit');
        $this->getJson($this->url('?limit=201'))->assertJsonValidationErrors('limit');
        $this->getJson($this->url('?limit=abc'))->assertJsonValidationErrors('limit');
        $this->getJson($this->url('?limit=200'))->assertOk();
    }

    public function test_the_default_page_is_bounded_even_with_no_limit_given(): void
    {
        Task::factory()->count(105)->create(['board_id' => $this->board->id]);

        $this->getJson($this->url())->assertOk()
            ->assertJsonCount(100, 'data')
            ->assertJsonPath('has_more', true);
    }

    public function test_the_number_of_queries_does_not_grow_with_the_number_of_tasks(): void
    {
        $people = User::factory()->count(10)->create();
        foreach ($people as $person) {
            $this->board->members()->attach($person->id, ['role' => Board::ROLE_MEMBER]);
        }

        $count = function (): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->getJson($this->url())->assertOk();

            return count(DB::getQueryLog());
        };

        Task::factory()->count(2)->create(['board_id' => $this->board->id, 'assigned_to' => $people[0]->id]);
        $few = $count();

        foreach ($people as $person) {
            Task::factory()->count(5)->create(['board_id' => $this->board->id, 'assigned_to' => $person->id]);
        }
        $many = $count();

        $this->assertSame($few, $many, 'assignees are eager loaded: no N+1');
    }

    public function test_assignee_and_board_indexes_exist(): void
    {
        $indexes = collect(DB::select(
            DB::getDriverName() === 'sqlite'
                ? "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'tasks'"
                : "SELECT indexname AS name FROM pg_indexes WHERE tablename = 'tasks'"
        ))->pluck('name');

        $this->assertTrue($indexes->contains('tasks_assigned_to_index'));
        $this->assertTrue($indexes->contains('tasks_board_id_status_index'));
    }
}
