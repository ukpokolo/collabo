#!/bin/sh
# Reverb role: the WebSocket server. Needs APP_KEY and the REVERB_* settings
# but never touches the database.
set -eu
cd /app

php artisan config:cache

# The host must be an IP, never a hostname (ReactPHP rejects names).
exec php artisan reverb:start --host=0.0.0.0 --port="${PORT:-8080}"
