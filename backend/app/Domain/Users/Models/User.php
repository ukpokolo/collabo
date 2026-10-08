<?php

namespace App\Domain\Users\Models;

use App\Domain\Boards\Models\Board;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    // HasApiTokens supplies createToken() / tokens() — the frontend and API
    // live on different domains, so auth travels as a Bearer token.
    use HasApiTokens, HasFactory, Notifiable;

    // Factory discovery is namespace-based and does not know about Domain/.
    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function boards(): BelongsToMany
    {
        return $this->belongsToMany(Board::class, 'board_user')->withPivot('role')->withTimestamps();
    }

    /** Most tokens one account keeps; signing in again on an extra device retires the oldest. */
    public const MAX_TOKENS = 20;

    /**
     * Issue an API token, tidying this user's old ones first. Pruning here, at
     * sign-in, means expired rows are cleaned up without needing a scheduler.
     */
    public function issueToken(): string
    {
        $this->tokens()
            ->where('created_at', '<', now()->subMinutes((int) config('sanctum.expiration')))
            ->delete();

        $surplus = $this->tokens()->count() - (self::MAX_TOKENS - 1);

        if ($surplus > 0) {
            $this->tokens()->orderBy('id')->limit($surplus)->get()->each->delete();
        }

        return $this->createToken('collabo')->plainTextToken;
    }
}
