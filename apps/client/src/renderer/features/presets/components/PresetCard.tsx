import * as React from 'react';
import { PushPinSimple, Play, PencilSimple, Trash } from '@phosphor-icons/react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import type { Preset } from '../types';

interface PresetCardProps {
  preset: Preset;
  onTogglePin: (id: number) => void;
  onLaunch: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function PresetCard({ preset, onTogglePin, onLaunch, onEdit, onDelete }: PresetCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="text-2xl select-none">{preset.icon || '▣'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate font-medium">{preset.name}</div>
            {preset.pinned ? <PushPinSimple size={12} weight="fill" className="text-accent" /> : null}
          </div>
          <div className="text-xs text-text-muted">{preset.apps.length} приложений</div>
          {preset.apps.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {preset.apps.slice(0, 4).map((a) => (
                <Badge key={`${a.path}-${a.name}`} variant="outline">{a.name}</Badge>
              ))}
              {preset.apps.length > 4 ? <Badge variant="outline">+{preset.apps.length - 4}</Badge> : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onTogglePin(preset.id)} title={preset.pinned ? 'Открепить' : 'Закрепить'}>
            <PushPinSimple size={14} weight={preset.pinned ? 'fill' : 'regular'} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onLaunch(preset.id)} title="Запустить">
            <Play size={14} weight="fill" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEdit(preset.id)} title="Редактировать">
            <PencilSimple size={14} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(preset.id)} title="Удалить" className="hover:text-red-400">
            <Trash size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
