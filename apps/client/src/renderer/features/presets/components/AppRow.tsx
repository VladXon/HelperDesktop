import * as React from 'react';
import { FolderOpen, X, Lock } from '@phosphor-icons/react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import type { PresetApp } from '../types';

interface AppRowProps {
  app: PresetApp;
  onChange: (v: PresetApp) => void;
  onRemove: () => void;
}

export function AppRow({ app, onChange, onRemove }: AppRowProps): React.JSX.Element {
  const browse = async (): Promise<void> => {
    const path = await window.api.dialog.openFile([
      { name: 'Исполняемые файлы', extensions: ['exe', 'bat', 'cmd', 'lnk'] },
      { name: 'Все файлы', extensions: ['*'] },
    ]);
    if (path) onChange({ ...app, path });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-bg-secondary p-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <Label className="text-xs">Название</Label>
          <Input value={app.name} onChange={(e) => onChange({ ...app, name: e.target.value })} />
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="self-end hover:text-red-400">
          <X size={16} />
        </Button>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <Label className="text-xs">Путь</Label>
          <Input value={app.path} onChange={(e) => onChange({ ...app, path: e.target.value })} />
        </div>
        <Button variant="outline" size="icon" onClick={browse} title="Обзор">
          <FolderOpen size={16} />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Switch id={`admin-${app.name}-${app.path}`} checked={app.runAsAdmin} onCheckedChange={(v) => onChange({ ...app, runAsAdmin: Boolean(v) })} />
        <Lock size={14} className="text-text-muted" />
        <Label htmlFor={`admin-${app.name}-${app.path}`} className="text-xs">Запустить от администратора</Label>
      </div>
    </div>
  );
}
