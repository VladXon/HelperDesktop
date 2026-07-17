import { ipcMain, Notification } from 'electron';

export function registerPushIpc(): void {
  ipcMain.handle('push:show', async (_e, title: string, body: string) => {
    if (!title && !body) return;
    const notif = new Notification({
      title: title || 'OpenCode',
      body: body || '',
      silent: false,
    });
    notif.show();
  });
}
