# Collabo

A real-time kanban board for teams. Boards are private to their members; changes show up for everyone on the board as they happen.

- **Boards and roles.** Anyone can create boards. The owner adds people by email as *members* (edit tasks) or *viewers* (read only). Non-members cannot tell a board exists.
- **Realtime.** Task changes and who is online reach everyone on the board over WebSockets. If the connection drops, the board says so and catches up on reconnect.
- **Sign-up by emailed code.** No passwords in the clear, no token until the email is verified; the sign-up form does not reveal which addresses already have accounts.
- **Feature flags** with a command-line kill switch, no redeploy.

**Stack:** Laravel 12 API (Sanctum Bearer tokens, Reverb WebSockets, Pennant flags) and a Next.js 15 / React 19 frontend (TanStack Query, Zustand, dnd-kit, Tailwind). Postgres in production, SQLite locally.

## Run it locally

You need PHP 8.4 (with `pdo_sqlite`, `pcntl`, `sockets`, `bcmath`), Composer 2 and Node 22.

```bash
# API
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate

# Frontend
cd ../frontend
cp .env.local.example .env.local
npm install
```

Then run **all four** processes, each in its own terminal. Realtime needs every one of them: broadcasting is queued, so without the worker the request returns 200 and the event never leaves.

```bash
cd backend  && php artisan serve          # API         http://localhost:8000
cd backend  && php artisan reverb:start   # WebSockets  :8080
cd backend  && php artisan queue:work     # broadcasts and mail
cd frontend && npm run dev                # the app     http://localhost:3000
```

Open http://localhost:3000 and sign up. Locally mail is written to the log instead of sent, so get your six-digit code with:

```bash
cd backend && php artisan otp:latest
```

## Check your work

```bash
# backend (from backend/)
php artisan test            # PHPUnit, in-memory SQLite
./vendor/bin/pint --test    # formatting

# frontend (from frontend/)
npm run lint && npm run typecheck && npm run build

# end to end (from e2e/): the real API, worker, Reverb and frontend in a headless browser
npm ci && npx playwright install --with-deps chromium
node run.mjs                # about 75 seconds, 56 checks
```

CI runs all of these on every pull request, plus a Docker image build and a weekly dependency audit.

## Where things are

```
backend/app/Domain/{Auth,Boards,Tasks,Users,Features}   models, controllers, policies, routes, per domain
frontend/features/{auth,board,tasks,presence,users,flags,realtime}   screens, hooks, API clients, per feature
e2e/                  browser tests against the real stack
scripts/smoke.mjs     post-deploy check (API, proxy, CSP, Reverb origins, a task round trip)
docs/                 deployment guide and launch checklist
render.yaml           Render blueprint (free plans)
```

[`CLAUDE.md`](CLAUDE.md) holds the conventions and the non-obvious things that are easy to break (cache key rules, why Sanctum has no stateful domains, the rate-limit design, and so on). Read it before changing auth, realtime or the query cache.

## Deploying

Free plans only: Vercel (frontend), Render (API and Reverb), Neon (Postgres). See [`docs/deployment.md`](docs/deployment.md) for the steps, the limits you will feel (cold starts, 750 shared instance-hours, no shell), email setup and rollback, and [`docs/launch-checklist.md`](docs/launch-checklist.md) for what is verified and what is still on you before real users arrive.

## Known limitations

- Cards in a column are ordered by recent activity; there is no manual reordering.
- People are added to a board by email only if they already have an account; there are no invitations for people who do not.
- Member and role changes are not realtime (task changes are).
- No error tracking or alerting, and no automated database backups; both are described in the deployment guide.
- Sign-up is open to anyone with an email address.
