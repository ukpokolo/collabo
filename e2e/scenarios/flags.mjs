// Feature flags: hidden by default, switchable from the command line, per user and globally,
// and a change reaches an open tab on focus.
import { signUp } from '../lib/browser.mjs';
import { sleep, waitFor } from '../lib/check.mjs';

export const name = 'feature flags and the kill switch';

export async function run({ stack, browser, check }) {
  const page = await (await browser.newContext()).newPage();
  await signUp(stack, page, 'Flo Flag', 'flo@example.com');
  await page.getByRole('button', { name: 'Board', exact: true }).first().waitFor();
  await sleep(800);

  // The sidebar has its own placeholder "Calendar" item, so look only in the top bar.
  const top = () => page.locator('header').first();
  const tabs = async () => ({
    list: await top().getByRole('button', { name: 'List', exact: true }).count(),
    calendar: await top().getByRole('button', { name: 'Calendar', exact: true }).count(),
  });
  const reload = async () => {
    await page.reload();
    await page.getByRole('button', { name: 'Board', exact: true }).first().waitFor({ timeout: 10000 });
    await sleep(800);
  };

  let t = await tabs();
  check('by default the placeholder List and Calendar tabs are hidden', t.list === 0 && t.calendar === 0, JSON.stringify(t));

  const flags = await page.evaluate(async () => {
    const r = await fetch('/api/features', { headers: { Accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('collabo:token')}` } });
    return r.json();
  });
  check('/api/features lists every flag, all off', Object.keys(flags).length === 3 && Object.values(flags).every((v) => v === false), JSON.stringify(flags));

  stack.artisan('features:set', 'list-view', 'on');
  await reload();
  t = await tabs();
  check('features:set list-view on shows the List tab and only that', t.list === 1 && t.calendar === 0, JSON.stringify(t));

  stack.artisan('features:set', 'calendar-view', 'on', '--user=flo@example.com');
  await reload();
  t = await tabs();
  check('a per-user flag shows Calendar for that user', t.list === 1 && t.calendar === 1, JSON.stringify(t));

  stack.artisan('features:set', 'list-view', 'off');
  stack.artisan('features:set', 'calendar-view', 'off');
  await reload();
  t = await tabs();
  check('the kill switch hides both again', t.list === 0 && t.calendar === 0, JSON.stringify(t));

  stack.artisan('features:set', 'list-view', 'on');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })));
  check('a change reaches an open tab on focus, without a reload', await waitFor(async () => (await tabs()).list === 1, 8000));
}
