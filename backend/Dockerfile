# One image, three start commands: API, queue worker, Reverb.
# Render has no native PHP runtime, so Laravel must ship as a container.
FROM php:8.3-cli-alpine

RUN apk add --no-cache postgresql-dev linux-headers $PHPIZE_DEPS \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql pcntl sockets bcmath \
    && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy manifests first so dependency layers cache across code-only changes.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
RUN composer dump-autoload --optimize --no-dev --no-interaction \
    && mkdir -p storage/framework/{cache/data,sessions,views} storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Render injects $PORT. Overridden per service in render.yaml.
ENV PHP_CLI_SERVER_WORKERS=4
CMD php artisan migrate --force \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan serve --host=0.0.0.0 --port="${PORT:-8000}" --no-reload
