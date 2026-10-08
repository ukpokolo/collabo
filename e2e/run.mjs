#!/usr/bin/env node
// Runs every scenario against the real stack: API, queue worker, Reverb and the
// production frontend build, each scenario on a fresh database.
//
//   npm ci && npx playwright install --with-deps chromium     (first time)
//   node run.mjs                  everything (builds the frontend first)
//   node run.mjs --skip-build     reuse an existing frontend/.next build
//   node run.mjs --only paging    scenarios whose file name contains "paging"
//
// Needs PHP 8.4 with composer dependencies installed in backend/, and npm
// dependencies installed in frontend/. CHROMIUM_PATH points at a browser Playwright
// did not install itself.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createReporter } from './lib/check.mjs';
import { launch } from './lib/browser.mjs';
import { FRONTEND, PORTS, REVERB_KEY, Stack } from './lib/stack.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

// The frontend bakes these in at build time (and the CSP is built from the Reverb ones).
const buildEnv = {
  ...process.env,
  NEXT_PUBLIC_API_URL: `http://localhost:${PORTS.api}`,
  NEXT_PUBLIC_REVERB_APP_KEY: REVERB_KEY,
  NEXT_PUBLIC_REVERB_HOST: 'localhost',
  NEXT_PUBLIC_REVERB_PORT: String(PORTS.reverb),
  NEXT_PUBLIC_REVERB_SCHEME: 'http',
};

if (!flag('--skip-build') || !existsSync(path.join(FRONTEND, '.next'))) {
  console.log('Building the frontend…');
  const build = spawnSync('npm', ['run', 'build'], { cwd: FRONTEND, env: buildEnv, stdio: ['ignore', 'ignore', 'inherit'] });
  if (build.status !== 0) {
    console.error('Frontend build failed.');
    process.exit(1);
  }
}

const scenarioDir = path.join(import.meta.dirname, 'scenarios');
const files = readdirSync(scenarioDir).filter((f) => f.endsWith('.mjs')).sort().filter((f) => !only || f.includes(only));
if (!files.length) {
  console.error(`No scenario matches "${only}".`);
  process.exit(2);
}

const stack = new Stack();
const cleanup = async () => { await stack.stopAll(); };
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await cleanup(); process.exit(130); });

const summary = [];
let browser;

try {
  await stack.startWeb();
  browser = await launch();

  for (const file of files) {
    const scenario = await import(path.join(scenarioDir, file));
    const report = createReporter(scenario.name);
    console.log(`\n${scenario.name}  (${file})`);
    const started = Date.now();

    try {
      await stack.startBackend();
      await scenario.run({ stack, browser, check: report.check });
    } catch (error) {
      report.check(`scenario completed without an error`, false, error.message.split('\n')[0]);
    } finally {
      await stack.stopBackend();
    }

    summary.push({ name: scenario.name, passed: report.results.filter((r) => r.ok).length, failed: report.failed(), seconds: Math.round((Date.now() - started) / 1000) });
  }
} finally {
  await browser?.close();
  await cleanup();
}

console.log('\n──────────────── summary');
for (const row of summary) {
  console.log(`${row.failed ? 'FAIL' : 'PASS'}  ${row.name.padEnd(42)} ${String(row.passed).padStart(2)} passed, ${row.failed} failed  (${row.seconds}s)`);
}
const failed = summary.reduce((n, row) => n + row.failed, 0);
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll end-to-end checks passed.');
process.exit(failed ? 1 : 0);
