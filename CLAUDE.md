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

**Backend tests:** `cd backend && php artisan test` (PHPUnit, in-memory SQLite locally; CI runs them against Postgres). They cover auth, tasks/filters and channel authorization. **There is still no frontend test runner.** Frontend checks are `npm run lint` (ESLint, including the layer-boundary rule below), `npm run typecheck` and `npm run build`; CI runs all three. `NotifyTaskCompleted` sleeps, so fake the bus in tests that move a task to `done`.

## Architecture

### Backend structure: domains

```
backend/app/Domain/
  Auth/   Http/(Controllers, Requests)  Models/OtpCode  Services/OtpService  Mail/OtpMail  routes.php
  Tasks/  Http/Controllers  Models/Task  Policies/TaskPolicy  Events/TaskUpdated  Jobs/NotifyTaskCompleted  routes.php
  Boards/ Http/(Controllers)  Models/Board  Policies/BoardPolicy  Services/BoardService  routes.php
  Users/  Models/User
```

`routes/api.php` only sets the prefix and middleware; each domain owns its `routes.php`. Config, migrations, factories, seeders and views stay in Laravel's standard locations. `LatestOtpCommand` stays in `app/Console/Commands` because Laravel only auto-discovers commands there.

Things that are easy to break:

- **Models under `Domain/` need `newFactory()`.** Factory discovery is namespace-based and does not know about `Domain/`.
- **`AppServiceProvider` pins `Relation::morphMap(['App\\Models\\User' => User::class])`.** `personal_access_tokens.tokenable_type` stores that legacy string for every token issued before `User` moved. Remove the map and every existing login returns 500 (`LoginTest` covers it).
- **Queued jobs serialise class names.** Drain the queue (`queue:work --stop-when-empty`) before deploying a namespace move, or in-flight `TaskUpdated`/`NotifyTaskCompleted` jobs fail with a missing class. The wire event name is unaffected (`TaskUpdated::broadcastAs()` is explicit).

### Frontend structure: feature folders

```
frontend/
  app/            route files only
  features/
    auth/ tasks/ board/ presence/ users/
      api.ts  keys.ts  types.ts  store.ts  hooks/  components/   (only what the feature needs)
  components/ui/      shared primitives
  components/layout/  app shell
  hooks/              shared hooks (useDebounced, useDismissable)
  lib/                http client, echo, token store, channels, utils
  providers/  store/
```

Rule, enforced by ESLint (`no-restricted-imports`): shared code (`components/ui`, `lib`, `hooks`) **must not import from `features/`**. Anything both `lib` and a feature need (e.g. the token store) lives in `lib`. Query keys, types and constants belong to the feature that owns them.

### Boards and authorization

Every task belongs to a board; a user sees only boards they are a member of. Roles live on the `board_user` pivot: `owner` (rename/delete the board, manage members), `member` (read and write tasks) and `viewer` (read only).

- Routes: `/api/boards` (CRUD), `/api/boards/{board}/members`, `/api/boards/{board}/tasks` (list/create) and `/api/tasks/{task}` (show/update/delete — shallow nesting).
- `BoardPolicy` returns **404 to non-members** (ids are sequential, so 403 would confirm they exist) and 403 to members whose role is too low. `TaskPolicy` delegates to it, so a task is exactly as accessible as its board.
- `assigned_to` must be a member of the task's board. `board_id` is never accepted from a request body.
- The `board.{boardId}` channel callback checks membership, so a user cannot subscribe to a board they are not on.
- There is deliberately **no all-users endpoint**: the member list is per board. Verifying an email for the first time creates the user's own board.
- Owner cannot be removed or demoted; ownership transfer is not built.

### Frontend routes and the current board

- `/` → redirects to the last-used board (`features/board/lastBoard.ts`), else the first, else offers to create one.
- `/boards/[boardId]` (kanban) and `/boards/[boardId]/members` (roster, invites, rename/delete). `/tasks/[id]` loads the task first and takes its board from `task.board_id`.
- `<BoardProvider boardId>` (`features/board/context.tsx`) tells everything below which board it is on. `useTasks`, `useCreateTask`, `useTaskBroadcast`, `usePresence` and `useBoardMembers` read it with `useBoardId()` and **throw outside a provider** — wrap new board-level pages in one.
- **Optimistic updates and realtime patches sweep `taskKeys.board(boardId)`, never `taskKeys.all`.** Sweeping all lists would put a task created on one board into every other board's cached lists.
- There is no all-users list. The assignee roster is `useBoardMembers()`.
- Viewers get a read-only UI (no composer, drag, delete or editing). That is a courtesy; the API is what enforces it.

### Auth is Bearer tokens, not cookies

Frontend and API are deployed to separate origins, so Sanctum is used in **personal access token** mode. Consequences that are easy to break:

- `BroadcastServiceProvider` registers `/broadcasting/auth` with **`auth:sanctum`**, not `web`. There is no session cookie on that request.
- `lib/echo.ts` passes `Authorization: Bearer` in Echo's `auth.headers`.
- `lib/http.ts` attaches the token (stored by `lib/token.ts`) and, on any 401, clears it so `AuthGuard` redirects instead of looping.
- `AuthGuard` is a convenience only. Every protected route sits behind `auth:sanctum` server-side.

Signup issues **no token** until the emailed OTP is verified. OTPs are hashed (`OtpCode`), single-use, 10-minute TTL, 5-attempt cap. Auth endpoints use named rate limiters defined in `AppServiceProvider` — a plain `throttle:x,y` keys guests on domain+IP only, which would let one signup sequence lock the user out of every other auth endpoint.

### Requests are same-origin via Next rewrites

`next.config.mjs` proxies `/api/*` and `/broadcasting/auth` to `NEXT_PUBLIC_API_URL`. All frontend fetches use **relative paths** so the same code works locally and deployed. Don't introduce absolute API URLs.

### State: Query owns server data, Zustand owns UI only

This is the rule to preserve:

- **TanStack Query** is the single source of truth for tasks/users/session.
- **Zustand** (`features/*/store.ts`, plus `store/useToastStore.ts`) holds only drag state, composer state, filters, sidebar/mobile-nav flags, toasts. It deliberately stores **no task data**.
- Inbound WebSocket events patch the *same* Query cache (`features/tasks/hooks/useTaskBroadcast`), so a remote change is indistinguishable from a local one.

**Query key discipline matters here.** `taskKeys.all` (`['tasks']`, in `features/tasks/keys.ts`) is a *prefix* that mutations sweep with `setQueriesData`. The detail query is rooted at `['task', id]` — a different root — because a key nested under `['tasks']` would be handed to a list updater, throw inside `onMutate`, and silently cancel the mutation with no request and no error. `patchLists` also guards with `Array.isArray`.

### Realtime flow

```
mutation → PUT /api/tasks/{id} (policy: board role) → DB write → returns immediately
                               → TaskUpdated queued
                                 → queue:work → Reverb → private-board.{boardId} → other clients on that board patch cache
```

- `TaskUpdated` broadcasts on a **`PrivateChannel`**; `routes/channels.php` authorizes it.
- One `Broadcast::channel('board.{boardId}')` registration serves both private and presence: Laravel strips the `private-`/`presence-` prefix *before* matching, so registering `presence-board.{id}` is dead code.
- `->toOthers()` only works because `lib/http.ts` sends `X-Socket-Id` from `getSocketId()`.
- On a `deleted` event the payload is **only `{ id }`** — the row is gone. `TaskUpdatedEvent` is a discriminated union; narrow on `type` before reading other fields.
- In the hooks, use `echo.leaveChannel('private-board.{id}')`, **never** `echo.leave('board.{id}')` — the latter also tears down the presence channel the other hook owns.

### Search and filtering are server-side

`GET /api/boards/{board}/tasks` accepts `search`, `assigned_to` (comma-separated ids plus the literal `unassigned`), and `status`. `TaskController::index` escapes LIKE wildcards. The board never filters client-side; filters go into the query key and onto the URL, debounced 300 ms in `BoardView`.

### Styling

Colours are semantic CSS variables in `app/globals.css`, mapped to Tailwind names in `tailwind.config.ts` (`bg-surface`, `text-foreground-muted`, `border-line`, `bg-primary`, `bg-danger-soft`, …). Use those, not raw palette classes or hex.

**Every source folder must be in the Tailwind `content` globs** (`app`, `components`, `features`, `hooks`, `lib`, `providers`, `store`). The avatar palette (`lib/utils.ts`) and column dot/tint classes (`features/board/constants.ts`) exist only as string literals; drop a glob and Tailwind purges them, rendering avatars as white text on nothing. `typecheck` and `build` do not catch this, so add the glob when you add a top-level folder.

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
