<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('board_id')->nullable(false)->change();

            // The board view always filters by board, then status or recency.
            $table->index(['board_id', 'status']);
            $table->index(['board_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['board_id', 'status']);
            $table->dropIndex(['board_id', 'updated_at']);
            $table->foreignId('board_id')->nullable()->change();
        });
    }
};
