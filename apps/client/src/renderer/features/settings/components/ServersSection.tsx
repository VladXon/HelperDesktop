import type * as React from 'react';
import { useState } from 'react';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';

type ServerId = 'server1' | 'server2';

interface VpsServer {
  id: string;
  label: string;
  os: string;
  config: string;
  type: string;
}

const servers: VpsServer[] = [
  {
    id: 'server1',
    label: 'Сервер 1 — Belarus',
    os: 'Ubuntu 24.04 LTS',
    config: '2 vCPU / 4GB RAM / 50GB SSD',
    type: 'KVM',
  },
  {
    id: 'server2',
    label: 'Сервер 2 — Germany',
    os: 'Ubuntu 22.04',
    config: '1 vCPU / 4GB RAM / 10GB',
    type: 'KVM',
  },
];

export function ServersSection(): React.JSX.Element {
  const [activeServer, setActiveServer] = useState<ServerId>('server1');

  const active = servers.find((s) => s.id === activeServer)!;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary">Целевой сервер</label>
        <Select value={activeServer} onChange={(e) => setActiveServer(e.target.value as ServerId)}>
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        {servers.map((s) => {
          const isActive = s.id === active.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveServer(s.id as ServerId)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-accent/50 bg-accent/5'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-semibold text-text-primary">{s.label}</span>
                {isActive ? <Badge variant="outline">активен</Badge> : null}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>ОС: {s.os}</span>
                <span>Конфиг: {s.config}</span>
                <span>Тип: {s.type}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-text-muted bg-white/5 rounded-xl p-4">
        <p className="font-medium text-text-primary mb-1">Деплой</p>
        <p className="mt-1">
          Команда: <code className="text-accent">VPS={active.id} ./scripts/deploy.sh</code>
        </p>
      </div>
    </div>
  );
}
