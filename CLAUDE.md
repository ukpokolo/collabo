# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Collabo is a real-time kanban board: a Laravel 12 API (`backend/`) and a Next.js 14 App Router frontend (`frontend/`), connected by Laravel Reverb WebSockets.

This file is the only current documentation. The original scaffold's `README.md` files and `LEARNING.md` were removed because they described a superseded design (Laravel 11, a public `board.1` channel, no authentication).

## Commands

All backend commands run from `backend/`, frontend from `frontend/`.

```bash
# backend
composer install
php artisan migrate
php artisan serve                # HTTP API      :8000
php artisan reverb:start         # WebSockets    :8080
php artisan queue:work           # broadcasts + jobs
php artisan otp:latest           # print the newest OTP from the mail log
./vendor/bin/pint                # PHP formatter

# frontend
npm install
npm run dev                      # :3000
npm run typecheck                # tsc --noEmit
npm run build
```

**All four processes are required for realtime to work.** Broadcasting is queued, so without `queue:work` the HTTP request still returns 200 and the event sits unsent in the `jobs` table.

**There is no test suite.** No `tests/` directory, no `phpunit.xml`, no frontend test runner, no ESLint config — `phpunit` is in `require-dev` but unconfigured, and `npm run lint` will prompt to create a config. Verify changes with `npm run typecheck`, `npm run build`, `php -l`, and by exercising the API.

## Architecture

### Auth is Bearer tokens, not cookies

Frontend and API are deployed to separate origins, so Sanctum is used in **personal access token** mode. Consequences that are easy to break:

- `BroadcastServiceProvider` registers `/broadcasting/auth` with **`auth:sanctum`**, not `web`. There is no session cookie on that request.
- `lib/echo.ts` passes `Authorization: Bearer` in Echo's `auth.headers`.
- `lib/api/http.ts` attaches the token and, on any 401, clears it so `AuthGuard` redirects instead of looping.
- `AuthGuard` is a convenience only. Every protected route sits behind `auth:sanctum` server-side.

Signup issues **no token** until the emailed OTP is verified. OTPs are hashed (`OtpCode`), single-use, 10-minute TTL, 5-attempt cap. Auth endpoints use named rate limiters defined in `AppServiceProvider` — a plain `throttle:x,y` keys guests on domain+IP only, which would let one signup sequence lock the user out of every other auth endpoint.

### Requests are same-origin via Next rewrites

`next.config.mjs` proxies `/api/*` and `/broadcasting/auth` to `NEXT_PUBLIC_API_URL`. All frontend fetches use **relative paths** so the same code works locally and deployed. Don't introduce absolute API URLs.

### State: Query owns server data, Zustand owns UI only

This is the rule to preserve:

- **TanStack Query** is the single source of truth for tasks/users/session.
- **Zustand** (`store/`) holds only drag state, composer state, filters, sidebar/mobile-nav flags, toasts. It deliberately stores **no task data**.
- Inbound WebSocket events patch the *same* Query cache (`useTaskBroadcast`), so a remote change is indistinguishable from a local one.

**Query key discipline matters here.** `QUERY_KEYS.tasks` (`['tasks']`) is a *prefix* that mutations sweep with `setQueriesData`. The detail query is rooted at `['task', id]` — a different root — because a key nested under `['tasks']` would be handed to a list updater, throw inside `onMutate`, and silently cancel the mutation with no request and no error. `patchLists` also guards with `Array.isArray`.

### Realtime flow

```
mutation → PUT /api/tasks/{id} → DB write → returns immediately
                               → TaskUpdated queued
                                 → queue:work → Reverb → private-board.1 → other clients patch cache
```

- `TaskUpdated` broadcasts on a **`PrivateChannel`**; `routes/channels.php` authorizes it.
- One `Broadcast::channel('board.{boardId}')` registration serves both private and presence: Laravel strips the `private-`/`presence-` prefix *before* matching, so registering `presence-board.{id}` is dead code.
- `->toOthers()` only works because `lib/api/http.ts` sends `X-Socket-Id` from `getSocketId()`.
- On a `deleted` event the payload is **only `{ id }`** — the row is gone. `TaskUpdatedEvent` is a discriminated union; narrow on `type` before reading other fields.
- In the hooks, use `echo.leaveChannel('private-board.1')`, **never** `echo.leave('board.1')` — the latter also tears down the presence channel the other hook owns.

### Search and filtering are server-side

`GET /api/tasks` accepts `search`, `assigned_to` (comma-separated ids plus the literal `unassigned`), and `status`. `TaskController::index` escapes LIKE wildcards. The board never filters client-side; filters go into the query key and onto the URL, debounced 300 ms in `BoardView`.

### Styling

Colours are semantic CSS variables in `app/globals.css`, mapped to Tailwind names in `tailwind.config.ts` (`bg-surface`, `text-foreground-muted`, `border-line`, `bg-primary`, `bg-danger-soft`, …). Use those, not raw palette classes or hex.

**`./lib/**` must stay in the Tailwind `content` globs.** The avatar palette (`lib/utils.ts`) and column dot/tint classes (`lib/constants.ts`) exist only as string literals there; drop the glob and Tailwind purges them, rendering avatars as white text on nothing.

Shared primitives live in `components/ui/` (`Button`, `IconButton`, `Card`/`Badge`/`Skeleton`, `Avatar`/`AvatarStack`, `ErrorState`, `TextLink`). Reuse them rather than restyling inline. Popovers use the `useDismissable` hook.

Failed mutations surface via the `MutationCache` `onError` in `AppProviders`, which toasts everything except 422 (rendered inline by forms). Optimistic rollback alone looks identical to nothing happening.

## Environment gotchas

These are real defects that were diagnosed here; don't "fix" them back.

- **`AppServiceProvider` pushes `SystemRoot` onto `ServeCommand::$passthroughVariables` on Windows.** Laravel's allowlist spells it `SYSTEMROOT` and `in_array` is case-sensitive, so without this `php artisan serve` fails to bind on every port with `(reason: ?)`.
- **`config/reverb.php` binds via `REVERB_SERVER_HOST` (default `0.0.0.0`), not `REVERB_HOST`.** ReactPHP rejects hostnames; `localhost` throws `EINVAL`.
- **Reverb's `allowed_origins` are matched against the Origin **host** only** (`parse_url(..., PHP_URL_HOST)`). Full URLs like `http://localhost:3000` can never match.
- **`frontend/.npmrc` sets empty proxy values** so npm works off the corporate VPN. Restore the proxy lines when on it.
- **`MAIL_MAILER=log` means no email is delivered** — use `php artisan otp:latest`. Switch to Mailtrap sandbox (`sandbox.smtp.mailtrap.io`) for demos where someone else enters their address.

## Deployment notes

Vercel cannot run Laravel, Reverb, or the queue worker. The intended split is Next.js on Vercel; API, Reverb, and `queue:work` as separate Render services.

**SQLite will not work there** — Render's disk is ephemeral and the separate services cannot share a file. Postgres is required; it's a `.env` change since Eloquent abstracts the driver.

`next@14.2.5` has a published security advisory and should be upgraded.
