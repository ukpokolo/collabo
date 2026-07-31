<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['Collabo API' => 'OK'];
});

// The local-only /dev/login backdoor that existed here has been removed —
// real authentication now lives in routes/api.php, and presence uses the
// signed-in user's Sanctum token.
