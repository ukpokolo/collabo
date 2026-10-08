import { chromium } from 'playwright';
import { URLS } from './stack.mjs';

export function launch() {
  return chromium.launch({
    // Set CHROMIUM_PATH to use a browser that Playwright did not install itself.
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
}

/** Record Content-Security-Policy violations in every page of this context. */
export async function recordCspViolations(context) {
  await context.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
}

/** Sign up through the UI, enter the emailed code, and land on the user's own board. */
export async function signUp(stack, page, name, email, password = 'secret123') {
  await page.goto(`${URLS.web}/signup`);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: /create account|sign up/i }).click();
  await page.waitForURL(/verify-otp/);

  const code = stack.otp(email);
  await page.locator('[aria-label="Verification code"] input').first().click();
  await page.keyboard.type(code, { delay: 30 });
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(/\/boards\/\d+$/, { timeout: 20000 });
}

/** Create a task in the To Do column through the UI and return the API's status code. */
export async function addTask(page, title) {
  const response = page.waitForResponse((r) => /\/api\/boards\/\d+\/tasks$/.test(r.url()) && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add task to To Do' }).click();
  await page.getByLabel('New task name').fill(title);
  await page.keyboard.press('Enter');
  return (await response).status();
}

export const isVisible = (page, text) => page.getByText(text).first().isVisible().catch(() => false);

/** Cards currently in a column, counted from the DOM. */
export const cardCount = (page, column = 'To Do') =>
  page.locator(`section[aria-label="${column}"] p.text-sm.font-medium`).count();

/** Call the API from inside the page, as the app would, with the stored token. */
export function apiFromPage(page, pathname, init = {}) {
  return page.evaluate(
    async ({ pathname, init }) => {
      const token = localStorage.getItem('collabo:token');
      const response = await fetch(pathname, {
        ...init,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    { pathname, init },
  );
}
