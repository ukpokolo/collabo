# Deploying Collabo on free plans

Frontend on **Vercel**, API and WebSocket server on **Render**, database on **Neon**. Everything below uses free plans only. The limits that matter are listed first so none of them is a surprise.

```
 browser ──https──▶ Vercel (Next.js)
    │                  │  /api/*, /broadcasting/auth   (server-side rewrite)
    │                  ▼
    │              Render: collabo-api  ── queue worker runs inside this container
    │                  │         │
    │                  │         └────────▶ Neon Postgres  (data, queue, flags)
    │                  └──publishes events──▶ Render: collabo-reverb
    └──────────wss (direct)──────────────────────────┘
```

## What to expect from free plans

| | Behaviour | Consequence |
|---|---|---|
| Render web service | Suspended after 15 minutes with no traffic; waking takes about a minute. | The first request after a quiet spell is slow. The board's "Live updates are paused" banner shows while Reverb wakes, then it catches up by itself. |
| Render instance hours | 750 per month shared by all free services; suspended services use none. | An open tab keeps Reverb awake. Two services awake all month would exceed the allowance. |
| Render filesystem | Ephemeral. | Logs go to stderr (the Render log view); the rate-limit cache is a file and resets on restart. Nothing important lives on disk. |
| Render free Postgres | Expires after 30 days, then is deleted. | **Not used.** The database is Neon. |
| Render workers, cron, shell | Not available on free plans. | The queue worker runs inside the API container. Admin commands run from your machine against Neon (see below). |
| Neon | 0.5 GB, compute scales to zero after 5 minutes idle, 100 compute-hours a month, a 6-hour history window. | The first query after idle takes about a second. There is no real backup (see "Backups"). |
| Vercel Hobby | Fine for this. | None. |

These figures come from the providers' docs as of this writing (Render's from its published docs through a search; its pricing page could not be opened while this was written, so confirm the free-plan terms before relying on them).

## First deploy

### 1. Database (Neon)

1. Create a project in the same region as Render (`eu-central-1` for Frankfurt).
2. Copy the **direct** connection string (not the `-pooler` one) and make sure it ends in `?sslmode=require`:
   `postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### 2. App key

```bash
php artisan key:generate --show      # or: echo "base64:$(openssl rand -base64 32)"
```

### 3. API and Reverb (Render)

Render → **New → Blueprint** → this repo. It reads `render.yaml` and asks for the values marked `sync: false`:

| Variable | Service | Value |
|---|---|---|
| `APP_KEY` | api | from step 2 |
| `DB_URL` | api | the Neon string from step 1 |
| `APP_URL` | api | leave a placeholder; set after the first deploy |
| `APP_FRONTEND_URL` | api | placeholder for now |
| `REVERB_HOST` | api | placeholder for now |
| `MAIL_*`, `MAIL_FROM_ADDRESS` | api | see "Email" below |
| `REVERB_ALLOWED_ORIGINS` | reverb | placeholder for now |

`REVERB_APP_ID/KEY/SECRET` are generated on the API service and read by Reverb from it.

The API container migrates the database on start (under a lock), so the first deploy creates the schema.

### 4. Frontend (Vercel)

New project → this repo → **Root Directory: `frontend`**. Environment variables (all are baked in at build time, so changing one means a redeploy):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | the API's Render URL, e.g. `https://collabo-api.onrender.com` |
| `NEXT_PUBLIC_REVERB_APP_KEY` | the API service's `REVERB_APP_KEY` (copy it from the Render dashboard) |
| `NEXT_PUBLIC_REVERB_HOST` | the Reverb service's host, e.g. `collabo-reverb.onrender.com` |
| `NEXT_PUBLIC_REVERB_PORT` | `443` |
| `NEXT_PUBLIC_REVERB_SCHEME` | `https` |

### 5. Close the loop (Render again)

Now that all three URLs exist, set the placeholders and redeploy both services:

| Variable | Service | Value |
|---|---|---|
| `APP_URL` | api | the API's public URL |
| `APP_FRONTEND_URL` | api | the Vercel URL, e.g. `https://collabo.vercel.app` |
| `REVERB_HOST` | api | the Reverb **public** host, no scheme, e.g. `collabo-reverb.onrender.com` |
| `REVERB_ALLOWED_ORIGINS` | reverb | the Vercel **host**, no scheme, e.g. `collabo.vercel.app` |

`REVERB_ALLOWED_ORIGINS` takes hosts, never URLs, and never `*`. Reverb compares only the host part of the browser's `Origin`, so `https://collabo.vercel.app` can never match. Preview deployments on other Vercel hostnames are refused unless you add them (comma-separated).

### 6. Smoke test

```bash
SMOKE_WEB=https://collabo.vercel.app \
SMOKE_API=https://collabo-api.onrender.com \
SMOKE_REVERB=wss://collabo-reverb.onrender.com \
SMOKE_REVERB_KEY=<REVERB_APP_KEY> \
node scripts/smoke.mjs
```

It waits up to two minutes per check for sleeping services. It checks the API, the frontend-to-API proxy, the CSP, that Reverb accepts the frontend's origin and **refuses a foreign one**, and (if you add `SMOKE_EMAIL` and `SMOKE_PASSWORD` for a verified account with a board) a sign-in and a task round trip. Run it after every change to environment variables.

Each failure message names the likely cause. The usual ones: a wrong `NEXT_PUBLIC_API_URL` (rebuild the frontend), a `REVERB_APP_KEY` that differs between the API and the frontend, and `REVERB_ALLOWED_ORIGINS` set to `*` or to a URL.

### 7. First account

Sign up in the browser and enter the emailed code. If email is not set up yet, the code is in the API's logs (Render dashboard) while `MAIL_MAILER=log`.

## Email

Sign-up and password reset both email a six-digit code, so mail must really work.

- **Demo or staging:** Mailtrap's sandbox catches mail for any recipient (`sandbox.smtp.mailtrap.io`, port 2525). Nobody actually receives it.
- **Real delivery on a free plan:** Brevo or Resend have free tiers. Both require you to prove you own the sending address or domain. Set `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS` (an address you control and have verified).

Until `MAIL_FROM_ADDRESS` is set, mail comes from `hello@example.com`.

## Running things day to day

Render's free plan has no shell, so administrative commands run **on your machine against the production database**. Set `DB_URL` to the Neon string; they need no other service:

```bash
cd backend && composer install
export APP_ENV=production CACHE_STORE=file DB_CONNECTION=pgsql DB_URL='postgresql://…?sslmode=require'

php artisan features:set list-view off          # kill switch: everyone, immediately
php artisan features:set list-view on --user=you@example.com
php artisan queue:failed                        # broadcasts or mail that failed after 3 tries
php artisan queue:retry all
```

Be deliberate: this edits production data. Logs are in the Render dashboard (stderr).

### Deploying a change

Merge to `main`. Render and Vercel both rebuild automatically. The API runs pending migrations when it starts, under a lock. Migrations only move forward, so write them to be safe with the previous release still running for a minute.

If a release moves or renames PHP classes, in-flight queued jobs still name the old classes and will fail. Let the queue drain first, or `queue:retry all` afterwards.

### Rolling back

Render: **Manual Deploy** → pick the previous commit. Vercel: promote the previous deployment. A migration that has run is not undone by redeploying old code; if one was destructive, restore the Neon branch to a point before it (only possible inside Neon's 6-hour history window).

## Backups: the gap

Neon's free plan keeps six hours of history and no scheduled backups. For anything you cannot afford to lose, take a dump yourself on a schedule and store it somewhere private:

```bash
pg_dump "$DB_URL" --no-owner -Fc -f collabo-$(date +%F).dump
```

The database contains email addresses and password hashes: do not put dumps in a public place or a public repository's artifacts.

## Logs and monitoring

**Logs.** The API and Reverb write one JSON object per line to stderr, which Render shows under *Logs*. Every line from a request carries `request_id`, and `user_id` once the user is known. Every response, including errors, has an `X-Request-Id` header (visible in the browser's Network tab). So a report like "the board failed to save at 14:03" becomes: open the failing request, copy its `X-Request-Id`, search the logs for it.

**Uptime monitoring: be careful on free plans.** The obvious setup, pinging `/up` every five minutes, would keep the API awake all month. One service awake 24/7 uses about 744 of the 750 shared free instance-hours, and the constant database polling by the queue worker would keep Neon's compute awake too and use up its 100 compute-hours. Monitor the **frontend** (Vercel) instead, which does not wake anything, and use `node scripts/smoke.mjs` to check the whole stack on demand.

**Error tracking is not wired in.** Errors are in the logs, but nothing alerts you. When you want that, Sentry has a free plan: `composer require sentry/sentry-laravel` and `php artisan sentry:publish --dsn=…` for the API, and `@sentry/nextjs` for the frontend (add the Sentry ingest host to `connect-src` in `frontend/next.config.mjs`, or the CSP will block the reports). Check what the reports contain before enabling it: they can include request data and user ids.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Live updates are paused" never clears | Reverb is asleep (give it a minute), or `REVERB_APP_KEY` differs between the API and `NEXT_PUBLIC_REVERB_APP_KEY`, or `REVERB_ALLOWED_ORIGINS` lacks the Vercel host. Run the smoke test. |
| Everyone gets "Too many attempts" together | `TRUSTED_PROXIES` is not `*`, so every user shares the proxy's IP in the rate limiter. |
| Sign-up returns 201 but no email | `MAIL_*` not set (the code is in the API logs), or the sender is not verified with the provider. |
| Browser console: a request was blocked by Content Security Policy | `NEXT_PUBLIC_REVERB_*` was wrong when the frontend was built. The CSP's `connect-src` is built from them; fix and redeploy. |
| 500 right after a deploy | A failed migration stops the container from starting; check the API's logs. |
| First load after a quiet period takes about a minute | Render waking the service. Expected on free plans. |
| Tasks do not update live for others | The queue worker is not draining. `queue:failed` shows broadcast failures. |

## When to leave the free plans

The Render **Starter** plan removes the 15-minute sleep and gives a persistent service; that is the first thing to pay for if the cold starts bother people. Redis (queue and cache) and a separate worker service come after that, when the database queue becomes the bottleneck. Nothing in the code needs to change for any of those.
