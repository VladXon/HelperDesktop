import { app, BrowserWindow, ipcMain, net } from 'electron';
import WebSocket from 'ws';
import { apiFetch, getServerUrl } from '../utils/http-client.js';
import { readDeviceId } from '../utils/safe-storage.js';

let wsClient: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
const healthChannel = 'server:health';

function clearReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function wsUrl(base: string, deviceId: string): string {
  const u = new URL(base);
  const wsProtocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${u.host}/ws?deviceId=${encodeURIComponent(deviceId)}`;
}

async function connectWs(getWindow: () => BrowserWindow | null): Promise<void> {
  clearReconnect();
  if (wsClient) {
    try { wsClient.terminate(); } catch { /* ignore */ }
    wsClient = null;
  }
  let base: string;
  let deviceId: string;
  try {
    base = await getServerUrl();
    deviceId = await readDeviceId();
  } catch {
    scheduleReconnect(getWindow);
    return;
  }
  try {
    const sock = new WebSocket(wsUrl(base, deviceId));
    wsClient = sock;
    sock.on('open', () => {
      const win = getWindow();
      win?.webContents.send(healthChannel, { type: 'connected', timestamp: new Date().toISOString() });
    });
    sock.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type?: string; timestamp?: string; uptime?: number };
        const win = getWindow();
        win?.webContents.send(healthChannel, msg);
      } catch { /* ignore non-json */ }
    });
    sock.on('close', () => {
      const win = getWindow();
      win?.webContents.send(healthChannel, { type: 'disconnected', timestamp: new Date().toISOString() });
      scheduleReconnect(getWindow);
    });
    sock.on('error', () => {
      try { sock.terminate(); } catch { /* ignore */ }
    });
  } catch {
    scheduleReconnect(getWindow);
  }
}

function scheduleReconnect(getWindow: () => BrowserWindow | null): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => { void connectWs(getWindow); }, 5000);
}

export function registerServerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('server:get-url', async () => {
    return getServerUrl();
  });

  ipcMain.handle('server:set-url', async (_e, url: string) => {
    const { setServerUrl } = await import('../utils/http-client.js');
    await setServerUrl(url);
    void connectWs(getWindow);
  });

  ipcMain.handle('server:test', async () => {
    return apiFetch('/api/health', { auth: false });
  });

  ipcMain.handle('server:check-url', async (_e, url: string) => {
    try {
      const res = await net.fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { status: 'offline' as const };
      const data = (await res.json()) as { status?: string };
      return { status: data.status === 'ok' ? 'online' as const : 'offline' as const };
    } catch {
      return { status: 'offline' as const };
    }
  });

  ipcMain.handle('server:on-health', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? getWindow();
    const send = (msg: unknown): void => {
      win?.webContents.send(healthChannel, msg);
    };
    void connectWs(() => win);
    return () => {
      clearReconnect();
      if (wsClient) {
        try { wsClient.terminate(); } catch { /* ignore */ }
        wsClient = null;
      }
      void send;
    };
  });

  ipcMain.handle('server:dev-serverinfo', async () => {
    try {
      return await apiFetch('/api/dev/serverinfo');
    } catch {
      return { available: false, reason: 'Not available in production or unauthorized' };
    }
  });

  ipcMain.handle('server:dev-restart', async () => {
    await apiFetch('/api/dev/restart', { method: 'POST', body: {} });
  });

  ipcMain.handle('server:dev-op', async (_e, login: string) => {
    await apiFetch('/api/dev/op', { method: 'POST', body: { login } });
  });

  void app;
}
