import * as React from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useServerUrl } from '../hooks/useServerUrl';
import { DevConsole } from './DevConsole';

export function ServerSection(): React.JSX.Element {
  const { url, setUrl, status, version, check, save, saving } = useServerUrl();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Адрес сервера</Label>
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3001" className="flex-1" />
          <Button onClick={save} disabled={saving}>{saving ? 'Сохранение...' : 'Применить'}</Button>
          <Button variant="outline" onClick={check}>Проверить</Button>
        </div>
        <div className="text-xs text-text-muted">
          Статус: {status === 'online' ? `доступен (v${version})` : status === 'offline' ? 'недоступен' : 'не проверен'}
        </div>
      </div>
      <DevConsole />
    </div>
  );
}
