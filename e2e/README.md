# End-to-end tests

These drive the **real** stack in a headless browser: the Laravel API, a queue worker, Reverb and the production Next.js build. They exist because the frontend has no unit tests, and the behaviour that matters (who can see what, realtime, recovery from an outage) only shows up with everything running.

```bash
# first time
(cd ../backend && composer install)        # PHP 8.4 with pdo_sqlite, pcntl, sockets, bcmath
(cd ../frontend && npm ci)
npm ci && npx playwright install --with-deps chromium

# run
node run.mjs                  # everything; builds the frontend first (about a minute)
node run.mjs --skip-build     # reuse an existing frontend/.next
node run.mjs --only paging    # scenarios whose file name contains "paging"
```

About 75 seconds for the whole suite once the frontend is built. Ports 8000, 3000 and 8080 must be free. `CHROMIUM_PATH` points at a browser Playwright did not install itself.

Every scenario gets a **fresh SQLite database** (so one cannot affect another, rate-limit counters included, since the cache lives in that database), a real queue worker, and a Reverb process the test can stop and start.

| Scenario | What it proves |
|---|---|
| `tenancy` | Boards are private; viewer vs member vs owner; a non-member gets "doesn't exist"; Reverb channel authorization; realtime between two users; sign-up that reveals nothing about existing accounts; the CSP is silent in normal use and blocks sending the token to another server |
| `dragdrop` | Dragging a card between columns persists; a plain click still opens a card |
| `paging` | 250 tasks load in two requests; past 1,000 the board says so and stops |
| `reconnect` | Reverb killed: a banner appears, writes still succeed; Reverb restarted: the banner clears and the task created during the outage appears without a reload |
| `flags` | Flags are off by default; `features:set` and the per-user and global kill switches work; a change reaches an open tab on focus |
| `smoke` | `scripts/smoke.mjs` passes against a correctly configured stack |

## Writing a scenario

Add `scenarios/<name>.mjs` exporting `name` and `async run({ stack, browser, check })`; the runner picks it up. Use `check(description, ok)` for every assertion and give it a name that reads as a sentence about behaviour.

- **Wait in Node, not in the page.** `waitFor(fn)` in `lib/check.mjs` polls from Node, so it survives Next's hydration `history.replaceState`, which can cut `page.waitForFunction` short.
- **Prove a check can fail.** A negative check ("X is refused") needs a positive control showing the same probe succeeds when it should; otherwise a malformed probe passes for the wrong reason. Two checks here were once vacuous for exactly that reason.
- `php artisan serve` is started with `--no-reload`. Without it, `serve` unsets every environment variable it does not allow-list when a `.env` exists, and the API silently uses the wrong database.
