import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { sleep } from './check.mjs';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const BACKEND = path.join(ROOT, 'backend');
export const FRONTEND = path.join(ROOT, 'frontend');

export const PORTS = { api: 8000, web: 3000, reverb: 8080 };
export const URLS = {
  api: `http://localhost:${PORTS.api}`,
  web: `http://localhost:${PORTS.web}`,
  reverb: `ws://localhost:${PORTS.reverb}`,
};
export const REVERB_KEY = 'collabo-key';

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

async function waitForPort(port, label, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await portOpen(port)) return;
    await sleep(250);
  }
  throw new Error(`${label} did not start listening on :${port}`);
}

async function waitForPortFree(port, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!(await portOpen(port))) return;
    await sleep(150);
  }
  throw new Error(`:${port} is still in use; is a previous run still going?`);
}

/**
 * Owns the processes a scenario needs. Each scenario gets a fresh SQLite
 * database so scenarios cannot affect one another (rate-limit counters included,
 * as the cache lives in that database).
 */
export class Stack {
  constructor() {
    this.dir = mkdtempSync(path.join(os.tmpdir(), 'collabo-e2e-'));
    this.dbFile = path.join(this.dir, 'e2e.sqlite');
    this.procs = new Map();

    // The production image runs with expose_php off. `php artisan serve` would
    // otherwise send X-Powered-By, which the smoke script rightly flags.
    writeFileSync(path.join(this.dir, 'php.ini'), 'expose_php = Off\n');
  }

  /** Environment for every backend process. */
  env(extra = {}) {
    return {
      ...process.env,
      // A throwaway key so a run does not depend on backend/.env existing.
      APP_KEY: process.env.APP_KEY || `base64:${Buffer.alloc(32, 7).toString('base64')}`,
      APP_ENV: 'local', // otp:latest only runs locally
      APP_DEBUG: 'false',
      APP_URL: URLS.api,
      APP_FRONTEND_URL: URLS.web,
      DB_CONNECTION: 'sqlite',
      DB_DATABASE: this.dbFile,
      MAIL_MAILER: 'log',
      LOG_CHANNEL: 'single',
      CACHE_STORE: 'database',
      SESSION_DRIVER: 'array',
      QUEUE_CONNECTION: 'database',
      BROADCAST_CONNECTION: 'reverb',
      REVERB_APP_ID: 'collabo',
      REVERB_APP_KEY: REVERB_KEY,
      REVERB_APP_SECRET: 'collabo-secret',
      REVERB_HOST: 'localhost',
      REVERB_PORT: String(PORTS.reverb),
      REVERB_SCHEME: 'http',
      REVERB_SERVER_HOST: '0.0.0.0',
      REVERB_SERVER_PORT: String(PORTS.reverb),
      REVERB_ALLOWED_ORIGINS: 'localhost',
      PHP_CLI_SERVER_WORKERS: '4',
      PHPRC: this.dir,
      ...extra,
    };
  }

  artisan(...args) {
    return execFileSync('php', ['artisan', ...args], { cwd: BACKEND, env: this.env(), stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  }

  /** A fresh, migrated database and an empty mail log. */
  resetDatabase() {
    rmSync(this.dbFile, { force: true });
    writeFileSync(this.dbFile, '');
    this.artisan('migrate', '--force');
    rmSync(path.join(BACKEND, 'storage/logs/laravel.log'), { force: true });
  }

  #spawn(name, command, args, { cwd, env }) {
    // Own process group, so killing the group also takes down children
    // (`artisan serve` and Next both fork).
    const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'ignore', 'ignore'] });
    this.procs.set(name, child);
    child.on('exit', () => this.procs.get(name) === child && this.procs.delete(name));
  }

  async #kill(name) {
    const child = this.procs.get(name);
    if (!child) return;
    this.procs.delete(name);
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
  }

  async startApi() {
    await waitForPortFree(PORTS.api);
    // --no-reload: with a .env file present, `serve` otherwise unsets every
    // variable not on its allow-list so the child can re-read .env, which would
    // silently point the API at the default database instead of this run's.
    this.#spawn('api', 'php', ['artisan', 'serve', '--no-reload', `--port=${PORTS.api}`], { cwd: BACKEND, env: this.env() });
    await waitForPort(PORTS.api, 'API');
  }

  startWorker() {
    // A real queue worker, as in production: broadcasts are queued.
    this.#spawn('worker', 'php', ['artisan', 'queue:work', '--tries=1', '--sleep=1'], { cwd: BACKEND, env: this.env() });
  }

  async startReverb() {
    await waitForPortFree(PORTS.reverb);
    this.#spawn('reverb', 'php', ['artisan', 'reverb:start', `--port=${PORTS.reverb}`], { cwd: BACKEND, env: this.env() });
    await waitForPort(PORTS.reverb, 'Reverb');
  }

  async stopReverb() {
    await this.#kill('reverb');
    await waitForPortFree(PORTS.reverb);
  }

  /** The production frontend build, started once for the whole run. */
  async startWeb() {
    await waitForPortFree(PORTS.web);
    this.#spawn('web', 'npx', ['next', 'start', '-p', String(PORTS.web)], { cwd: FRONTEND, env: { ...process.env } });
    await waitForPort(PORTS.web, 'frontend');
  }

  /** API + worker + Reverb on a fresh database. */
  async startBackend() {
    this.resetDatabase();
    await this.startApi();
    this.startWorker();
    await this.startReverb();
  }

  async stopBackend() {
    for (const name of ['reverb', 'worker', 'api']) await this.#kill(name);
    await waitForPortFree(PORTS.api).catch(() => {});
    await waitForPortFree(PORTS.reverb).catch(() => {});
  }

  async stopAll() {
    for (const name of [...this.procs.keys()]) await this.#kill(name);
    rmSync(this.dir, { recursive: true, force: true });
  }

  /** The six-digit code most recently mailed to `email` (MAIL_MAILER=log). */
  otp(email) {
    const out = this.artisan('otp:latest', email);
    const match = out.match(/^\s*((?:\d\s+){5}\d)\s*$/m);
    if (!match) throw new Error(`no code found for ${email}:\n${out}`);
    return match[1].replace(/\s+/g, '');
  }

  mailLogPath() {
    return path.join(BACKEND, 'storage/logs/laravel.log');
  }

  hasMailLog() {
    return existsSync(this.mailLogPath());
  }
}
