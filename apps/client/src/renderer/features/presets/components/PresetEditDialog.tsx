import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { AppRow } from './AppRow';
import { AiInspectorDevPanel } from '../../ai-inspector';
import { useCreatePreset } from '../hooks/useCreatePreset';
import { useUpdatePreset } from '../hooks/useUpdatePreset';
import type { Preset, PresetApp } from '../types';

interface PresetEditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset: Preset | null;
  onSaved: () => void;
}

export function PresetEditDialog({ open, onOpenChange, preset, onSaved }: PresetEditDialogProps): React.JSX.Element {
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<string>('');
  const [apps, setApps] = useState<PresetApp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const create = useCreatePreset();
  const update = useUpdatePreset();

  useEffect(() => {
    if (open) {
      setError(null);
      if (preset) {
        setName(preset.name);
        setIcon(preset.icon);
        setApps(preset.apps);
      } else {
        setName('');
        setIcon('');
        setApps([]);
      }
    }
  }, [open, preset]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Введите название');
      return;
    }
    if (apps.length > 32) {
      setError('Максимум 32 приложения');
      return;
    }
    try {
      if (preset) {
        await update.mutateAsync({ id: preset.id, input: { name, icon, apps } });
      } else {
        await create.mutateAsync({ name, icon, apps });
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message ?? 'Ошибка сохранения');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{preset ? 'Редактирование пресета' : 'Новый пресет'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-2">
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preset-icon">Иконка</Label>
              <Input id="preset-icon" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={32} placeholder="🚀" className="w-24" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preset-name">Название</Label>
              <Input id="preset-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={128} required />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label className="grow">Приложения</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApps((a) => [...a, { name: '', path: '', runAsAdmin: false }])}
                disabled={apps.length >= 32}
              >
                <Plus size={14} /> Добавить
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {apps.map((app, idx) => (
                <AppRow
                  key={idx}
                  app={app}
                  onChange={(v) => setApps((a) => a.map((x, i) => (i === idx ? v : x)))}
                  onRemove={() => setApps((a) => a.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
        {import.meta.env.DEV ? <AiInspectorDevPanel /> : null}
      </DialogContent>
    </Dialog>
  );
}
