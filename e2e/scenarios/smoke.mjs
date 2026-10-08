// The post-deploy smoke script (scripts/smoke.mjs) against this stack, so it cannot rot.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { signUp } from '../lib/browser.mjs';
import { REVERB_KEY, ROOT, URLS } from '../lib/stack.mjs';

export const name = 'post-deploy smoke script';

export async function run({ stack, browser, check }) {
  const page = await (await browser.newContext()).newPage();
  await signUp(stack, page, 'Smoke Test', 'smoke@example.com');

  const result = spawnSync('node', [path.join(ROOT, 'scripts/smoke.mjs')], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SMOKE_WEB: URLS.web,
      SMOKE_API: URLS.api,
      SMOKE_REVERB: URLS.reverb,
      SMOKE_REVERB_KEY: REVERB_KEY,
      SMOKE_EMAIL: 'smoke@example.com',
      SMOKE_PASSWORD: 'secret123',
      SMOKE_WAKE_SECONDS: '20',
    },
  });

  for (const line of result.stdout.split('\n').filter(Boolean)) console.log(`    | ${line}`);
  check('every smoke check passes against a correctly configured stack', result.status === 0, `exit ${result.status}`);
}
