#!/bin/sh
# API role: migrate, warm caches, run a queue worker beside the web server.
set -eu
cd /app

# --isolated takes a lock, so two instances starting together don't race.
# A failed migration exits non-zero, so a bad deploy fails loudly here
# instead of serving against the wrong schema.
php artisan migrate --force --isolated

php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan view:cache

# Free hosting has no worker service, so the worker lives in this container.
# Broadcasts and mail are queued, so without it realtime silently stops. The
# loop restarts it if it exits (--max-time recycles it hourly to bound memory).
(
	while true; do
		php artisan queue:work --sleep=3 --tries=3 --timeout=90 --max-time=3000 || true
		sleep 2
	done
) &

exec frankenphp run --config /etc/frankenphp/Caddyfile --adapter caddyfile
