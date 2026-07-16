import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { log } from '../utils/logger.js';

const RESTART_BACKOFF_MS = [1000, 5000, 30_000, 60_000, 300_000];
const MAX_RESTARTS_IN_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;
const KILL_TIMEOUT_MS = 5000;

export interface BotManagerOptions {
  botPath: string;
  serverUrl: string;
  isWindows?: boolean;
}

export class BotManager {
  private child: ChildProcess | null = null;
  private stopping = false;
  private restartTimestamps: number[] = [];
  private gaveUp = false;
  private opts: BotManagerOptions;
  private restartTimer: NodeJS.Timeout | null = null;

  constructor(opts: BotManagerOptions) {
    this.opts = opts;
  }

  isRunning(): boolean {
    return this.child !== null && !this.gaveUp;
  }

  hasGivenUp(): boolean {
    return this.gaveUp;
  }

  start(): void {
    if (this.stopping || this.gaveUp) return;
    if (this.child) return;

    const entry = join(this.opts.botPath, 'src', 'index.ts');
    if (!existsSync(entry)) {
      log.error('bot entry not found, bot will not start', { entry });
      return;
    }

    const args = this.opts.isWindows
      ? ['cmd', '/c', 'npx', 'tsx', 'src/index.ts']
      : ['npx', 'tsx', 'src/index.ts'];
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      SERVER_URL: this.opts.serverUrl,
      BOT_MANAGED: '1',
      BOT_AUTOSTART: '1',
    };

    try {
      this.child = spawn(args[0]!, args.slice(1), {
        cwd: this.opts.botPath,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      log.error('bot spawn failed', { error: (e as Error).message });
      this.child = null;
      this.scheduleRestart();
      return;
    }

    log.bot('bot process started', { pid: this.child.pid, botPath: this.opts.botPath });

    this.child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) log.bot(`[bot] ${line.trim()}`);
      }
    });
    this.child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) log.error(`[bot stderr] ${line.trim()}`);
      }
    });

    this.child.on('exit', (code, signal) => {
      log.bot('bot process exited', { code, signal, pid: this.child?.pid });
      this.child = null;
      if (!this.stopping) {
        this.scheduleRestart();
      }
    });
  }

  private scheduleRestart(): void {
    if (this.stopping || this.gaveUp) return;

    const now = Date.now();
    this.restartTimestamps = this.restartTimestamps.filter((t) => now - t < WINDOW_MS);
    this.restartTimestamps.push(now);

    if (this.restartTimestamps.length > MAX_RESTARTS_IN_WINDOW) {
      this.gaveUp = true;
      log.error('bot gave up: too many restarts', {
        restarts: this.restartTimestamps.length,
        windowMs: WINDOW_MS,
      });
      return;
    }

    const attempt = this.restartTimestamps.length;
    const delay = RESTART_BACKOFF_MS[Math.min(attempt - 1, RESTART_BACKOFF_MS.length - 1)]!;
    log.bot('scheduling bot restart', { attempt, delayMs: delay });
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.start();
    }, delay);
    this.restartTimer.unref();
  }

  stop(): Promise<void> {
    this.stopping = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const child = this.child;
    if (!child) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        resolve();
      };
      const killTimer = setTimeout(() => {
        log.error('bot did not exit in time, sending SIGKILL');
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
        finish();
      }, KILL_TIMEOUT_MS);
      killTimer.unref();
      child.once('exit', () => {
        clearTimeout(killTimer);
        finish();
      });
      try {
        child.kill('SIGTERM');
      } catch {
        clearTimeout(killTimer);
        finish();
      }
    });
  }
}

void config;
