import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { registerAuthIpc } from './ipc/auth.js';
import { registerNotesIpc } from './ipc/notes.js';
import { registerPresetsIpc } from './ipc/presets.js';
import { registerSettingsIpc } from './ipc/settings.js';
import { registerTelegramIpc } from './ipc/telegram.js';
import { registerServerIpc } from './ipc/server.js';
import { registerDialogIpc } from './ipc/dialog.js';
import { registerWindowIpc, registerShellIpc, setMainWindow, setupDeepLink, handleDeepLink } from './ipc/window.js';
import { registerPushIpc } from './ipc/push.js';
import { registerPoeIpc } from './ipc/poe.js';
import { startPushWatcher } from './push-watcher.js';

if (requireElectronSquirrel()) app.quit();

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;

let mainWindow: BrowserWindow | null = null;

function requireElectronSquirrel(): boolean {
  try {
    const mod = require('electron-squirrel-startup') as boolean | { createSquirrelShortcut: () => void };
    if (typeof mod === 'boolean') return mod;
    if (mod && typeof mod.createSquirrelShortcut === 'function') {
      mod.createSquirrelShortcut();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function getMainWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return null;
}

function registerAllIpc(): void {
  registerAuthIpc();
  registerNotesIpc();
  registerPresetsIpc();
  registerSettingsIpc();
  registerTelegramIpc();
  registerServerIpc(getMainWindow);
  registerDialogIpc();
  registerWindowIpc();
  registerShellIpc();
  registerPushIpc();
  registerPoeIpc();
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    show: false,
    backgroundColor: '#131315',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const devUrl = typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? MAIN_WINDOW_VITE_DEV_SERVER_URL : void 0;
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow = win;
  setMainWindow(win);

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
}

app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  const allowed = ['178.172.137.167', '2.26.80.138'];
  try {
    const host = new URL(url).hostname;
    if (allowed.includes(host)) {
      event.preventDefault();
      callback(true);
      return;
    }
  } catch {
    // invalid url, deny
  }
  callback(false);
});

app.on('ready', () => {
  registerAllIpc();
  setupDeepLink(getMainWindow);
  createWindow();
  startPushWatcher();

  const { app: electronApp } = require('electron') as typeof import('electron');
  void electronApp;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

void handleDeepLink;
