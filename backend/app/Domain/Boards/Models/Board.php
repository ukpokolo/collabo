<?php

namespace App\Domain\Boards\Models;

use App\Domain\Boards\Policies\BoardPolicy;
use App\Domain\Tasks\Models\Task;
use App\Domain\Users\Models\User;
use Database\Factories\BoardFactory;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[UsePolicy(BoardPolicy::class)]
class Board extends Model
{
    use HasFactory;

    public const ROLE_OWNER = 'owner';

    public const ROLE_MEMBER = 'member';

    public const ROLE_VIEWER = 'viewer';

    public const ROLES = [self::ROLE_OWNER, self::ROLE_MEMBER, self::ROLE_VIEWER];

    /** Roles that may create, edit and delete tasks. */
    public const WRITE_ROLES = [self::ROLE_OWNER, self::ROLE_MEMBER];

    protected $fillable = ['name', 'owner_id'];

    // Factory discovery is namespace-based and does not know about Domain/.
    protected static function newFactory(): BoardFactory
    {
        return BoardFactory::new();
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'board_user')->withPivot('role')->withTimestamps();
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function roleOf(User $user): ?string
    {
        return $this->members()->where('users.id', $user->id)->first()?->pivot->role;
    }
}
