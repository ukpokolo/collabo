# syntax=docker/dockerfile:1
#
# One image, two roles (see docker/): the API (HTTP + a queue worker) and Reverb
# (WebSockets). Render has no PHP runtime, so Laravel ships as a container.

# ---- 1. PHP dependencies, without dev packages --------------------------------
FROM composer:2 AS vendor
WORKDIR /app

# Manifests first so this layer is cached across code-only changes. Platform
# checks are skipped here because this stage has no app extensions; the runtime
# stage below installs them.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist \
    --no-interaction --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --no-dev --no-interaction --ignore-platform-reqs

# ---- 2. Runtime ---------------------------------------------------------------
# FrankenPHP: a multi-threaded production server (Caddy + embedded PHP), not the
# single-process dev server `artisan serve` is.
FROM dunglas/frankenphp:1-php8.4-alpine

RUN install-php-extensions pdo_pgsql pcntl sockets bcmath opcache

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-app.ini"
COPY docker/Caddyfile /etc/frankenphp/Caddyfile

WORKDIR /app
COPY --from=vendor /app /app

COPY docker/start-api.sh docker/start-reverb.sh /usr/local/bin/

# Writable paths, then drop root. Caddy wants a home for its state: /tmp is fine
# because nothing in it needs to survive a restart.
RUN chmod +x /usr/local/bin/start-api.sh /usr/local/bin/start-reverb.sh \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && php artisan package:discover --ansi \
    && chown -R www-data:www-data storage bootstrap/cache

ENV XDG_CONFIG_HOME=/tmp/caddy-config \
    XDG_DATA_HOME=/tmp/caddy-data \
    APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

USER www-data

# Render injects $PORT. The default role is the API; the Reverb service
# overrides the command with start-reverb.sh.
EXPOSE 8000
CMD ["start-api.sh"]
