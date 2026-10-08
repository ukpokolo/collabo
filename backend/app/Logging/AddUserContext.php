<?php

namespace App\Logging;

use Illuminate\Log\Logger;
use Monolog\LogRecord;

/**
 * Stamps log records with the signed-in user's id, so "what did this user hit?"
 * is a search. Used as a channel `tap` in config/logging.php.
 *
 * It reads the user at the moment of logging. Sanctum's token guard does not
 * fire the Authenticated event (session guards do), so a listener on that event
 * would never run for this API's Bearer requests.
 */
class AddUserContext
{
    public function __invoke(Logger $logger): void
    {
        $logger->getLogger()->pushProcessor(function (LogRecord $record): LogRecord {
            // hasUser() only reports an already-resolved user; it never triggers
            // authentication itself, so logging cannot cause a database query.
            $guard = auth()->guard();

            if (! $guard->hasUser()) {
                return $record;
            }

            return $record->with(extra: [...$record->extra, 'user_id' => $guard->id()]);
        });
    }
}
