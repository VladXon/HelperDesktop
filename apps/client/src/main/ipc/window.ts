import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

function getFocusedWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

function broadcastMaximized(win: BrowserWindow): void {
  win.webContents.send('window:maximized-changed', win.isMaximized());
}

export function registerWindowIpc(): void {
  ipcMain.on('window:minimize', () => {
    getFocusedWindow()?.minimize();
  });

  ipcMain.on('window:maximize-toggle', () => {
    const win = getFocusedWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on('window:close', () => {
    getFocusedWindow()?.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return getFocusedWindow()?.isMaximized() ?? false;
  });

  ipcMain.handle('window:on-maximized-changed', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return () => undefined;
    const handler = (): void => broadcastMaximized(win);
    win.on('maximize', handler);
    win.on('unmaximize', handler);
    return () => {
      win.off('maximize', handler);
      win.off('unmaximize', handler);
    };
  });

  app.setAsDefaultProtocolClient('helperdesktop');
}

export function registerShellIpc(): void {
  ipcMain.handle('shell:open-external', async (_e, url: string) => {
    if (typeof url !== 'string' || !url) return false;
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:', 'tg:'].includes(parsed.protocol)) return false;
      await shell.openExternal(url);
      return true;
    } catch {
      return false;
    }
  });
}

export function setupDeepLink(getWindow: () => BrowserWindow | null): void {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }
  app.on('second-instance', (_e, argv) => {
    const win = getWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    const url = argv.find((a) => a.startsWith('helperdesktop://'));
    if (url) handleDeepLink(url, getWindow);
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url, getWindow);
  });

  if (process.platform === 'win32') {
    const url = process.argv.find((a) => a.startsWith('helperdesktop://'));
    if (url) handleDeepLink(url, getWindow);
  }
}

export function handleDeepLink(url: string, getWindow: () => BrowserWindow | null): void {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'note') {
      const idStr = parsed.pathname.replace(/^\/+/, '');
      const id = Number.parseInt(idStr, 10);
      if (Number.isFinite(id) && id > 0) {
        const win = getWindow();
        win?.webContents.send('deep-link:note', id);
      }
    }
  } catch {
    /* ignore */
  }
}

export function windowAssetsPath(): string {
  return join(__dirname, '..', 'renderer');
}
