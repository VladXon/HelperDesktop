import { ipcMain, shell } from 'electron';
import { spawn } from 'node:child_process';
import type { Preset, PresetApp } from '@helper/shared';
import { apiFetch } from '../utils/http-client.js';

function unwrapPreset(raw: { preset: Preset } | Preset): Preset {
  return 'preset' in raw ? raw.preset : raw;
}

function isWindows(): boolean {
  return process.platform === 'win32';
}

function launchApp(app: PresetApp): void {
  if (!app.path) return;
  if (isWindows() && app.runAsAdmin) {
    const escaped = app.path.replace(/'/g, "''");
    const cmd = `Start-Process -FilePath '${escaped}' -Verb RunAs`;
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', cmd], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', (err) => {
      console.error('launch failed', err);
    });
    child.unref();
    return;
  }
  const child = spawn(app.path, [], { detached: true, stdio: 'ignore' });
  child.on('error', (err) => {
    console.error('launch failed', err);
  });
  child.unref();
}

export function registerPresetsIpc(): void {
  ipcMain.handle('presets:get-all', async () => {
    const data = await apiFetch<{ presets: Preset[] }>('/api/presets');
    return data.presets;
  });

  ipcMain.handle('presets:save', async (_e, preset: { name: string; icon: string; apps: PresetApp[] }) => {
    const data = await apiFetch<{ preset: Preset }>('/api/presets', { method: 'POST', body: preset });
    return unwrapPreset(data);
  });

  ipcMain.handle('presets:update', async (_e, id: number, preset: { name?: string; icon?: string; apps?: PresetApp[]; pinned?: boolean }) => {
    const data = await apiFetch<{ preset: Preset }>(`/api/presets/${id}`, { method: 'PUT', body: preset });
    return unwrapPreset(data);
  });

  ipcMain.handle('presets:delete', async (_e, id: number) => {
    await apiFetch(`/api/presets/${id}`, { method: 'DELETE' });
  });

  ipcMain.handle('presets:launch', async (_e, id: number) => {
    const data = await apiFetch<{ preset: Preset }>(`/api/presets/${id}`);
    const preset = data.preset;
    if (!preset) return;
    for (const a of preset.apps) {
      try {
        launchApp(a);
      } catch (e) {
        console.error('launch app failed', a.path, e);
      }
    }
    void shell;
  });

  ipcMain.handle('presets:toggle-pin', async (_e, id: number) => {
    const data = await apiFetch<{ preset: Preset }>(`/api/presets/${id}/toggle-pin`, { method: 'PATCH', body: {} });
    return unwrapPreset(data);
  });
}
