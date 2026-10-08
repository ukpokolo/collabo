<?php

use App\Domain\Users\Models\User;

// Temporary alias so code that still says App\Models\User keeps working while
// tests migrate. Deleted in the next commit.
class_alias(User::class, 'App\Models\User');
