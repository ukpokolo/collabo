// Outage drill: Reverb goes away and comes back. Missed events are not replayed,
// so the board must refetch on reconnect.
import { addTask, isVisible, signUp } from '../lib/browser.mjs';
import { sleep, waitFor } from '../lib/check.mjs';
import { URLS } from '../lib/stack.mjs';

export const name = 'realtime outage and recovery';

export async function run({ stack, browser, check }) {
  const alice = await (await browser.newContext()).newPage();
  const bob = await (await browser.newContext()).newPage();
  await signUp(stack, alice, 'Alice Adams', 'alice@example.com');
  await signUp(stack, bob, 'Bob Brown', 'bob@example.com');

  await alice.goto(`${URLS.web}/boards/1/members`);
  await alice.getByLabel('Email').fill('bob@example.com');
  await alice.getByRole('button', { name: 'Add', exact: true }).click();
  await alice.getByText('Bob Brown').waitFor();
  await alice.goto(`${URLS.web}/boards/1`);
  await bob.goto(`${URLS.web}/boards/1`);
  await alice.getByRole('button', { name: 'Add task to To Do' }).waitFor();
  await bob.getByText(/online/).waitFor({ timeout: 15000 });

  await addTask(alice, 'Before outage');
  check('baseline: Bob sees a new task live', await waitFor(() => isVisible(bob, 'Before outage'), 15000));
  check('no banner while connected', (await bob.getByText(/Live updates are paused/).count()) === 0);

  // ---- outage
  await stack.stopReverb();
  check("Reverb down: Bob's banner appears", await waitFor(async () => (await bob.getByText(/Live updates are paused/).count()) > 0, 30000));
  const status = await addTask(alice, 'During outage');
  check('Reverb down: the write still succeeds (a broadcast failure stays in the queue)', status === 201, `status=${status}`);
  await sleep(2000);
  check('Reverb down: Bob does not see it yet', !(await isVisible(bob, 'During outage')));

  // ---- recovery
  await stack.startReverb();
  check("Reverb back: Bob's banner clears by itself", await waitFor(async () => (await bob.getByText(/Live updates are paused/).count()) === 0, 45000));
  check('Reverb back: the task created during the outage appears with no reload', await waitFor(() => isVisible(bob, 'During outage'), 20000));
  await addTask(alice, 'After outage');
  check('after recovery: live updates flow again (the channel re-subscribed)', await waitFor(() => isVisible(bob, 'After outage'), 20000));
}
