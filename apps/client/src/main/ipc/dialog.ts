import { dialog, ipcMain } from 'electron';

interface FileFilter {
  name: string;
  extensions: string[];
}

export function registerDialogIpc(): void {
  ipcMain.handle('dialog:open-file', async (event, filters: FileFilter[]) => {
    const win = event.sender ? undefined : undefined;
    void win;
    const result = await dialog.showOpenDialog({
      title: 'Выберите приложение',
      properties: ['openFile'],
      filters: filters?.length ? filters : [{ name: 'Все файлы', extensions: ['*'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });
}
