// Dragging a card between columns, and that a plain click still opens a card.
import { addTask, signUp } from '../lib/browser.mjs';
import { sleep, waitFor } from '../lib/check.mjs';

export const name = 'drag and drop';

export async function run({ stack, browser, check }) {
  const page = await (await browser.newContext()).newPage();
  await signUp(stack, page, 'Dana Drag', 'dana@example.com');
  await addTask(page, 'Move me');

  const column = (label) => page.getByRole('region', { name: label });
  await column('To Do').getByText('Move me').waitFor();
  check('the card starts in To Do', (await column('To Do').getByText('Move me').count()) === 1);

  const card = await column('To Do').getByText('Move me').boundingBox();
  const target = await column('In Progress').boundingBox();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  await page.mouse.down();
  await page.mouse.move(card.x + card.width / 2 + 20, card.y + card.height / 2 + 10, { steps: 5 });
  await page.mouse.move(target.x + target.width / 2, target.y + 120, { steps: 15 });
  await page.mouse.up();

  check('dragging a card to In Progress moves it', await waitFor(async () => (await column('In Progress').getByText('Move me').count()) === 1, 8000));
  check('it left To Do', (await column('To Do').getByText('Move me').count()) === 0);

  await sleep(500);
  await page.reload();
  check('the move persisted (the server was updated)', await waitFor(async () => (await column('In Progress').getByText('Move me').count()) === 1, 10000));

  await column('In Progress').getByText('Move me').click();
  check('a plain click on a card still opens it', await page.waitForURL(/\/tasks\/\d+/, { timeout: 8000 }).then(() => true, () => false));
  // The back link only knows the board once the task has loaded.
  await page.getByLabel('Task title').waitFor({ timeout: 10000 });
  check('the open card links back to the board it came from', (await page.getByRole('link', { name: /Board/ }).first().getAttribute('href'))?.startsWith('/boards/'));
}
