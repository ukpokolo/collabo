// A board bigger than one page, and one bigger than the cap.
import { cardCount, signUp } from '../lib/browser.mjs';
import { sleep } from '../lib/check.mjs';
import { URLS } from '../lib/stack.mjs';

export const name = 'paging and the 1,000-task cap';

const seed = (stack, count) =>
  stack.artisan('tinker', `--execute=\\App\\Domain\\Tasks\\Models\\Task::factory()->count(${count})->create(['board_id' => 1, 'status' => 'todo']); echo "seeded";`);

export async function run({ stack, browser, check }) {
  const page = await (await browser.newContext()).newPage();
  const requests = [];
  page.on('request', (r) => { if (/\/api\/boards\/1\/tasks\?/.test(r.url())) requests.push(r.url().replace(URLS.web, '')); });

  await signUp(stack, page, 'Pat Pager', 'pat@example.com');

  // Node-side polling: a page.waitForFunction would be cut short by Next's hydration replaceState.
  const settle = async (target, ms = 30000) => {
    const end = Date.now() + ms;
    let n = 0;
    while (Date.now() < end) {
      n = await cardCount(page).catch(() => -1);
      if (n >= target) break;
      await sleep(400);
    }
    await sleep(800);
    return n;
  };

  // 250 tasks is two pages of 200
  seed(stack, 250);
  requests.length = 0;
  await page.reload();
  const loaded = await settle(250);
  check('all 250 tasks are on the board', loaded === 250, `cards=${loaded}`);
  const distinct = [...new Set(requests)];
  check('they took 2 requests: limit=200, then the cursor', distinct.length === 2 && distinct[0].includes('limit=200') && !distinct[0].includes('cursor') && distinct[1].includes('cursor='), JSON.stringify(distinct.map((u) => u.slice(0, 64))));
  check('no truncation notice below the cap', (await page.getByText(/most recent tasks/).count()) === 0);

  // 1,100 tasks is past the 1,000 cap
  seed(stack, 850);
  requests.length = 0;
  await page.reload();
  const capped = await settle(1000, 40000);
  check('past the cap a notice says the board is truncated', await page.getByText(/most recent tasks/).waitFor({ timeout: 20000 }).then(() => true, () => false));
  check('loading stopped after 5 requests (1,000 tasks), not 6', new Set(requests).size === 5, `distinct=${new Set(requests).size}`);
  check('exactly 1,000 cards are rendered', capped === 1000 && (await cardCount(page)) === 1000, `cards=${await cardCount(page)}`);
}
