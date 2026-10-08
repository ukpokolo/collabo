<?php

/*
|--------------------------------------------------------------------------
| Feature flag rollout rules
|--------------------------------------------------------------------------
|
| Every key here becomes a Pennant feature (see FeatureServiceProvider). A
| user gets a flag when ANY of these hold:
|
|   enabled     on for everyone
|   emails      on for these addresses (lowercase)
|   percentage  on for this share of users, 0-100, stable per user
|
| Pennant stores each user's first result, so editing a rule does not change
| anyone already resolved. To apply a changed rule, or to flip a flag for
| everyone right now, use:  php artisan features:set <flag> on|off|default
|
| Names are mirrored in frontend/features/flags/definitions.ts.
*/

return [

    // Runs the (placeholder) completion job when a task moves to Done.
    'notify-on-complete' => [
        'enabled' => (bool) env('FEATURE_NOTIFY_ON_COMPLETE', false),
        'percentage' => 0,
        'emails' => [],
    ],

    // The List and Calendar tabs are placeholders; keep them hidden until built.
    'list-view' => [
        'enabled' => (bool) env('FEATURE_LIST_VIEW', false),
        'percentage' => 0,
        'emails' => [],
    ],

    'calendar-view' => [
        'enabled' => (bool) env('FEATURE_CALENDAR_VIEW', false),
        'percentage' => 0,
        'emails' => [],
    ],

];
