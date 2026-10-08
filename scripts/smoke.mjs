#!/usr/bin/env node
// Post-deploy smoke test. No dependencies; needs Node 22 (global fetch and WebSocket).
//
//   SMOKE_WEB=https://collabo.vercel.app \
//   SMOKE_API=https://collabo-api.onrender.com \
//   SMOKE_REVERB=wss://collabo-reverb.onrender.com \
//   SMOKE_REVERB_KEY=<REVERB_APP_KEY> \
//   [SMOKE_EMAIL=you@example.com SMOKE_PASSWORD=...] \
//   node scripts/smoke.mjs
//
// Free Render services sleep after 15 minutes idle and take about a minute to
// wake, so each check waits up to SMOKE_WAKE_SECONDS (default 120).

const env = (name, required = true) => {
  const value = process.env[name];
  if (!value && required) {
    console.error(`Missing ${name}. See the header of scripts/smoke.mjs.`);
    process.exit(2);
  }
  return value?.replace(/\/+$/, '');
};

const WEB = env('SMOKE_WEB');
const API = env('SMOKE_API');
const REVERB = env('SMOKE_REVERB');
const REVERB_KEY = env('SMOKE_REVERB_KEY');
const EMAIL = env('SMOKE_EMAIL', false);
const PASSWORD = process.env.SMOKE_PASSWORD;
const WAKE_MS = Number(process.env.SMOKE_WAKE_SECONDS ?? 120) * 1000;

let failures = 0;
const pass = (name, extra = '') => console.log(`PASS  ${name}${extra ? `  — ${extra}` : ''}`);
const fail = (name, why) => {
  failures++;
  console.log(`FAIL  ${name}  — ${why}`);
};
async function check(name, fn) {
  try {
    const extra = await fn();
    pass(name, typeof extra === 'string' ? extra : '');
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}

/** Retry while a sleeping free service wakes up (it answers 502/503/timeouts meanwhile). */
async function waitFor(url, init = {}) {
  const end = Date.now() + WAKE_MS;
  let last = 'no response';
  while (Date.now() < end) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000), redirect: 'manual' });
      if (response.status < 500) return response;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.cause?.code ?? error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`${url} never became ready (${last})`);
}

const json = { Accept: 'application/json', 'Content-Type': 'application/json' };

await check('API is up (/up)', async () => {
  const response = await waitFor(`${API}/up`);
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
});

await check('API refuses unauthenticated requests with 401', async () => {
  const response = await waitFor(`${API}/api/boards`, { headers: { Accept: 'application/json' } });
  if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`);
});

await check('API does not advertise its server software', async () => {
  const response = await waitFor(`${API}/up`);
  const exposed = ['server', 'x-powered-by'].filter((h) => response.headers.has(h));
  if (exposed.length) throw new Error(`exposes ${exposed.join(', ')}: ${exposed.map((h) => response.headers.get(h)).join(', ')}`);
});

await check('Frontend serves with a CSP that allows the Reverb origin and nothing foreign', async () => {
  const response = await waitFor(`${WEB}/login`);
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  const csp = response.headers.get('content-security-policy') ?? '';
  const reverbHost = new URL(REVERB).host.replace(/:443$/, '');
  if (!csp.includes('connect-src')) throw new Error('no CSP connect-src');
  if (!csp.includes(reverbHost)) throw new Error(`connect-src does not include ${reverbHost}; rebuild the frontend with the right NEXT_PUBLIC_REVERB_* (they are baked in at build time)`);
  if (!csp.includes("frame-ancestors 'none'")) throw new Error('frame-ancestors missing');
  if (response.headers.get('x-content-type-options') !== 'nosniff') throw new Error('nosniff missing');
});

await check('Frontend proxies /api to the API (same-origin rewrite)', async () => {
  const response = await waitFor(`${WEB}/api/boards`, { headers: { Accept: 'application/json' } });
  if (response.status !== 401) {
    throw new Error(`expected the API's 401 through the frontend, got ${response.status}; check NEXT_PUBLIC_API_URL at build time`);
  }
});

/**
 * Open a WebSocket as a browser on `origin` would and report the first message
 * Reverb sends. A browser always sends an Origin; Reverb rejects a client with
 * none when an allow-list is set. Reverb enforces the allow-list after the
 * upgrade, as a `pusher:error` (code 4009) frame, not as an HTTP refusal.
 */
function firstReverbMessage(origin) {
  const url = `${REVERB}/app/${REVERB_KEY}?protocol=7&client=smoke&version=8.4.0`;
  return new Promise((resolve) => {
    const socket = new WebSocket(url, { headers: { Origin: origin } });
    const timer = setTimeout(() => { socket.close(); resolve({ event: 'timeout' }); }, 20000);
    socket.onmessage = (message) => {
      clearTimeout(timer);
      socket.close();
      try {
        const frame = JSON.parse(String(message.data));
        const data = typeof frame.data === 'string' ? JSON.parse(frame.data) : frame.data;
        resolve({ event: frame.event, code: data?.code, message: data?.message });
      } catch {
        resolve({ event: 'unparseable' });
      }
    };
    socket.onerror = () => { clearTimeout(timer); resolve({ event: 'connection error' }); };
  });
}

const frontendOrigin = new URL(WEB).origin;

await check('Reverb accepts a WebSocket from the frontend origin', async () => {
  const deadline = Date.now() + WAKE_MS;
  let last = { event: 'none' };
  while (Date.now() < deadline) {
    last = await firstReverbMessage(frontendOrigin);
    if (last.event === 'pusher:connection_established') return;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  const why = last.code === 4001
    ? "REVERB_APP_KEY here does not match the API's"
    : last.code === 4009
      ? `REVERB_ALLOWED_ORIGINS does not include ${new URL(WEB).host}`
      : `${last.event} ${last.message ?? ''}`;
  throw new Error(why);
});

await check('Reverb REFUSES a WebSocket from a foreign origin', async () => {
  // The previous check is this one's control: the same probe, with the legitimate
  // origin, was accepted, so a refusal here is about the origin and nothing else.
  const foreign = await firstReverbMessage('https://evil.example');
  if (foreign.event === 'pusher:connection_established') {
    throw new Error('Reverb accepted evil.example. Set REVERB_ALLOWED_ORIGINS to the frontend host (not "*", not a URL).');
  }
  if (foreign.event !== 'pusher:error' || foreign.code !== 4009) {
    throw new Error(`expected a 4009 origin error, got ${foreign.event} ${foreign.code ?? ''}`);
  }
  return 'pusher:error 4009';
});

if (EMAIL && PASSWORD) {
  let token;
  let boardId;
  let taskId;

  await check('Sign in through the frontend proxy', async () => {
    const response = await fetch(`${WEB}/api/auth/login`, { method: 'POST', headers: json, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
    const body = await response.json().catch(() => ({}));
    if (response.status !== 200 || !body.token) throw new Error(`HTTP ${response.status} ${JSON.stringify(body).slice(0, 100)}`);
    token = body.token;
  });

  const authed = () => ({ ...json, Authorization: `Bearer ${token}` });

  if (token) {
    await check('List boards, create a task, read it back, delete it (database round trip)', async () => {
      const boards = await (await fetch(`${WEB}/api/boards`, { headers: authed() })).json();
      if (!Array.isArray(boards) || !boards.length) throw new Error('the smoke user has no board');
      boardId = boards[0].id;
      const created = await fetch(`${WEB}/api/boards/${boardId}/tasks`, { method: 'POST', headers: authed(), body: JSON.stringify({ title: 'smoke test (safe to delete)' }) });
      if (created.status !== 201) throw new Error(`create returned ${created.status}`);
      taskId = (await created.json()).id;
      const page = await (await fetch(`${WEB}/api/boards/${boardId}/tasks?limit=200`, { headers: authed() })).json();
      if (!page.data?.some((t) => t.id === taskId)) throw new Error('the new task is not in the list');
      const removed = await fetch(`${WEB}/api/tasks/${taskId}`, { method: 'DELETE', headers: authed() });
      if (removed.status !== 200) throw new Error(`delete returned ${removed.status}`);
      taskId = undefined;
    });

    await check('Feature flags endpoint answers', async () => {
      const flags = await (await fetch(`${WEB}/api/features`, { headers: authed() })).json();
      if (typeof flags !== 'object' || Array.isArray(flags)) throw new Error('unexpected body');
      return `${Object.keys(flags).length} flags`;
    });

    if (taskId) await fetch(`${WEB}/api/tasks/${taskId}`, { method: 'DELETE', headers: authed() }).catch(() => {});
    await fetch(`${WEB}/api/auth/logout`, { method: 'POST', headers: authed() }).catch(() => {});
  }
} else {
  console.log('SKIP  signed-in checks (set SMOKE_EMAIL and SMOKE_PASSWORD to a verified account with a board)');
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
