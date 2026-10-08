<?php

namespace Database\Factories;

use App\Domain\Boards\Models\Board;
use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Board>
 */
class BoardFactory extends Factory
{
    protected $model = Board::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'owner_id' => User::factory(),
        ];
    }

    /** Also enrol the owner as an `owner` member, as the API always does. */
    public function withOwnerMember(): static
    {
        return $this->afterCreating(function (Board $board) {
            $board->members()->syncWithoutDetaching([$board->owner_id => ['role' => Board::ROLE_OWNER]]);
        });
    }
}
