import { watch } from 'node:fs';
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { app, Notification } from 'electron';
import { existsSync } from 'node:fs';

interface PushMessage {
  title?: string;
  body: string;
}

function getPushFilePath(): string {
  return process.env.AI_PUSH_FILE || join(app.getPath('userData'), 'ai-push.json');
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function handlePushFileChange(filePath: string): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(async () => {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const data = JSON.parse(raw) as PushMessage;
      if (!data.body) return;
      const notif = new Notification({
        title: data.title || 'OpenCode',
        body: data.body,
        silent: false,
      });
      notif.show();
    } catch {
      // ignore parse errors or missing file
    }
  }, 200);
}

export function startPushWatcher(): void {
  const filePath = getPushFilePath();
  console.log(`[push-watcher] watching ${filePath}`);

  if (existsSync(filePath)) {
    void handlePushFileChange(filePath);
  }

  try {
    const watcher = watch(filePath, (eventType) => {
      if (eventType === 'change') {
        void handlePushFileChange(filePath);
      }
    });

    app.on('before-quit', () => {
      watcher.close();
    });
  } catch (err) {
    console.error('[push-watcher] failed to start:', err);
  }
}

export { getPushFilePath };
