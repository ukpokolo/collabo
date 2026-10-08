/** Tiny assertion reporter: prints PASS/FAIL lines and keeps score for the runner. */
export function createReporter(scenario) {
  const results = [];

  const check = (name, ok, extra = '') => {
    results.push({ name, ok: Boolean(ok) });
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
    return Boolean(ok);
  };

  return {
    check,
    scenario,
    results,
    failed: () => results.filter((r) => !r.ok).length,
  };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll `fn` until it returns truthy or `ms` elapses. Node-side, so it survives page navigations. */
export async function waitFor(fn, ms = 30000, every = 300) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn().catch(() => false)) return true;
    await sleep(every);
  }
  return false;
}
