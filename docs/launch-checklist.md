# Launch checklist

An honest account of where this stands. The legend matters more than the ticks:

- ✅ **Checked automatically.** A test or CI job fails if it breaks. Named so you can find it.
- 🧪 **Checked by hand, once.** Done and observed, but nothing re-checks it. How is stated.
- ⬜ **Yours to do.** Needs your accounts, your decisions or a real deployment.
- ⚠️ **Known gap.** Not built, or deliberately left, with the reason.

**Nothing has been deployed.** The container, the smoke test and the end-to-end suite were run locally and in CI. The wiring between Vercel, Render and Neon (URLs, environment variables, DNS, email) has not run anywhere. That is what the smoke test is for, after your first deploy.

## 1. Code and tests

- ✅ Backend: 127 PHPUnit tests against **Postgres** in CI (`backend.yml`). They cover auth, boards and roles, task CRUD and filters, paging, feature flags, rate limits, channel authorization, the data migration for existing tasks, and request logging.
- ✅ Frontend: lint (with a rule that keeps shared code from importing features), typecheck and a production build (`frontend.yml`).
- ✅ End to end: 56 checks against the real API, queue worker, Reverb and production frontend in a headless browser (`e2e.yml`, `e2e/`). Passed in CI and twice in a row locally.
- ✅ The Docker image builds and boots in CI against Postgres, runs as non-root, has a queue worker, hides its `Server` header, and Reverb listens (`docker.yml`).
- ✅ Dependencies: `composer audit --locked` clean; `npm audit --omit=dev` shows **0 vulnerabilities** in what ships (`security.yml`, weekly and on lock-file changes).
- ⚠️ `npm audit` including dev tooling shows 9 findings (high and moderate) inside the linter's dependency tree. They are never built into the app or run in production.
- ⚠️ **No load test.** Responses are bounded (pages of at most 200, a 1,000-task cap), the query count does not grow with the number of tasks (tested), and an idle API container uses about 82 MiB. None of that says how many simultaneous users one free instance holds. Expect the first limit to be the single API process and Neon's compute.
- ⚠️ No frontend unit tests. The end-to-end suite is the frontend's safety net; it does not cover mobile layouts, the members screen's role-change, remove, rename and delete actions, or password reset in the browser.

## 2. Security

- ✅ Boards are private. A non-member gets 404, not 403, so ids cannot be probed; viewers cannot write; assignees must be members; `board_id` is never read from a request body. (`BoardApiTest`, `TaskCrudTest`, the `tenancy` scenario.)
- ✅ Realtime channels check membership (`ChannelAuthTest`, and real WebSockets in the `tenancy` scenario).
- ✅ Tokens expire (14 days); expired ones are cleared at sign-in; an account keeps at most 20 (`TokenLifecycleTest`). Existing tokens older than 14 days stop working when this ships.
- ✅ Sign-up reveals nothing about existing accounts: same response, same timing work, owner told by email, nothing overwritten (`RegisterTest`, the `tenancy` scenario).
- ✅ Login, code requests and code guesses are limited per IP **and** per address, so inventing an `X-Forwarded-For` does not lift the limit (`ProxyAndLimitsTest`).
- ✅ Content-Security-Policy and security headers; silent in normal use, and a request or WebSocket to a foreign server is blocked (`tenancy` scenario).
- ✅ Reverb refuses a foreign origin and accepts the frontend's, checked by `scripts/smoke.mjs` against a deployment. Local result: pass, and fails with a pointed message when Reverb allows every origin or the key is wrong.
- ✅ Secret scanning on every PR (GitGuardian).
- ⬜ Generate a fresh `APP_KEY`; never reuse one from a chat, a screenshot or a repository.
- ⬜ Set `REVERB_ALLOWED_ORIGINS` to the exact frontend host, never `*`, and re-run the smoke test after changing it.
- ⬜ **Decide who may sign up.** It is open to anyone with an email address. If this is for one team, gate it (invite-only, an allow-list) before you publish the URL. Not built.
- ⚠️ The API token lives in `localStorage`, so an injected script could read it. The CSP's `connect-src` stops it being sent to another server, but not from being used from the page. An `httpOnly` cookie would be stronger and is a larger change to the auth design.
- ⚠️ `script-src` allows `'unsafe-inline'` (Next's own bootstrap is inline; a nonce would force every page to render dynamically). Fine while no page renders user-supplied HTML; revisit if one does.
- ⚠️ A trusted `X-Forwarded-For` can be forged, so the per-address limits are what actually bound attacks. Their cost: someone can burn a victim's login bucket and briefly lock them out (15 minutes).

## 3. Deployment

None of these have been done. The guide: [`deployment.md`](deployment.md).

- ⬜ Neon project in the same region as Render; copy the **direct** connection string.
- ⬜ Render blueprint: `collabo-api` and `collabo-reverb` on the free plan; fill in the `sync: false` values.
- ⬜ Vercel project (root directory `frontend`) with the five `NEXT_PUBLIC_*` variables. They are baked in at build time, so changing one means a rebuild.
- ⬜ Close the loop: set `APP_FRONTEND_URL`, `REVERB_HOST`, `REVERB_ALLOWED_ORIGINS`, redeploy both Render services.
- ⬜ Email: a provider and a verified sender address. Until `MAIL_FROM_ADDRESS` is set, mail comes from `hello@example.com`, and sign-up is unusable without working mail.
- ⬜ Run `node scripts/smoke.mjs` (usage in the file's header). It names the likely cause of each failure.
- ⬜ Sign up, verify, create a board and a task, open it in a second browser, confirm realtime.
- ⬜ Confirm Render's current free-plan terms yourself. Its pricing page could not be opened while this was written; the figures in the guide come from its published docs through a search.
- ⚠️ Render's free plan sleeps services after 15 idle minutes (about a minute to wake) and shares 750 instance-hours a month. An open tab keeps Reverb awake all month, which uses most of the allowance. Paying for the API service is the first upgrade worth making.

## 4. Data

- ✅ The migration that moved existing tasks onto a default board is tested with old-shape data, including refusing to orphan tasks that have no owner (`BackfillMigrationTest`). If you have existing data, take a copy first.
- ⬜ **Backups.** Neon's free plan keeps six hours of history and nothing else. Decide how often you will `pg_dump` and where the dumps go (they contain emails and password hashes). The command is in the guide.
- ⬜ Restore a dump into a scratch database once, before you need it. Not done.
- ⚠️ **No account deletion and no data export.** If real people will use this and privacy law applies to you, you need both, plus a privacy notice and terms. None are written here, and they are not a code-only decision.

## 5. Running it

- ✅ Missed realtime events are recovered: when Reverb goes away and returns, the board shows a banner, writes keep succeeding, and the task created during the outage appears with no reload (`reconnect` scenario; with the refetch disabled it does not appear).
- ✅ Logs are JSON with a request id on every line and on every response (`X-Request-Id`), and the user id once known (`RequestContextTest`).
- ✅ Kill switch: `php artisan features:set <flag> off`, including for users who have not been seen yet (`SetFeatureCommandTest`, `flags` scenario). On Render's free plan there is no shell, so it is run from your machine against Neon.
- 🧪 The in-container queue worker restarts itself after being killed (observed once locally; CI checks that it is running, not that it restarts).
- ⬜ Know where the logs are (Render dashboard) and how to follow one request by its id (the guide).
- ⚠️ **No error tracking and no alerting.** Errors are in the logs and nothing tells you. Sentry steps are in the guide. Do not point an uptime monitor at the API on free plans: it would keep the API and Neon awake all month.
- ⚠️ The database queue polls every few seconds while the API is awake, which keeps Neon's compute running. Redis and a separate worker are the scale-up path, not an MVP need.

## 6. Product

- ⚠️ Cards in a column are ordered by recent activity; there is no manual reordering.
- ⚠️ People can only be added to a board if they already have an account.
- ⚠️ Member and role changes are not realtime; task changes are.
- ⚠️ The sidebar items (Home, Tasks, Calendar, Team, Notifications) and the "Product Board" space are placeholders that do nothing. The List and Calendar tabs are hidden behind feature flags for the same reason.

## First week

- Run the smoke test after **every** environment change.
- Watch the logs for 429s that hit many people at once: that is `TRUSTED_PROXIES` missing, not an attack.
- If something misbehaves, flip its flag off first and investigate second.
- Merge anything that needs a schema change at a quiet time. The API migrates itself on start, under a lock, and migrations only move forward.
