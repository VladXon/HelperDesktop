import * as React from 'react';
import { Cloud, Circle, CheckCircle, XCircle } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';

interface VpsEntry {
  id: string;
  name: string;
  ip: string;
  domain: string;
  url: string;
  isPrimary: boolean;
}

const servers: VpsEntry[] = [
  {
    id: 'primary',
    name: 'DesktopHelperServ',
    ip: '178.172.137.167',
    domain: '',
    url: 'http://178.172.137.167:3001',
    isPrimary: true,
  },
  {
    id: 'backup',
    name: 'DesktopHelperServ',
    ip: '2.26.80.138',
    domain: 'verbal-ivory-buzzard.play2go.cloud',
    url: 'http://2.26.80.138:3001',
    isPrimary: false,
  },
];

type HealthMap = Record<string, 'online' | 'offline' | 'checking'>;

function useVpsHealth(): HealthMap {
  const [health, setHealth] = React.useState<HealthMap>({ primary: 'checking', backup: 'checking' });

  React.useEffect(() => {
    let mounted = true;
    const check = () => {
      for (const s of servers) {
        const url = `${s.url}/api/health`;
        setHealth((prev) => ({ ...prev, [s.id]: 'checking' }));
        fetch(url, { signal: AbortSignal.timeout(5000) })
          .then((r) => {
            if (mounted) setHealth((prev) => ({ ...prev, [s.id]: r.ok ? 'online' : 'offline' }));
          })
          .catch(() => {
            if (mounted) setHealth((prev) => ({ ...prev, [s.id]: 'offline' }));
          });
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return health;
}

export function VpsSelector(): React.JSX.Element {
  const [activeServer, setActiveServer] = React.useState<string>('primary');
  const health = useVpsHealth();

  React.useEffect(() => {
    window.api.settings.get('vps:active').then((v) => {
      if (typeof v === 'string') setActiveServer(v);
    });
  }, []);

  const select = (id: string) => {
    setActiveServer(id);
    window.api.settings.set('vps:active', id);
  };

  const active = servers.find((s) => s.id === activeServer)!;
  const activeHealth = health[active.id] ?? 'offline';

  return (
    <div className="px-3 pt-4 pb-2 border-b border-white/10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 truncate">
              {activeHealth === 'online' ? (
                <CheckCircle size={12} className="text-green-400 shrink-0" weight="fill" />
              ) : activeHealth === 'offline' ? (
                <XCircle size={12} className="text-red-400 shrink-0" weight="fill" />
              ) : (
                <Circle size={12} className="text-text-muted shrink-0" />
              )}
              <Cloud size={14} className="shrink-0 text-accent" />
              <span className="truncate">{active.ip}</span>
            </span>
            <span className="text-text-muted">▼</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Серверы VPS</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {servers.map((s) => {
            const h = health[s.id] ?? 'offline';
            const isActive = s.id === active.id;
            return (
              <DropdownMenuItem
                key={s.id}
                onSelect={() => select(s.id)}
                className={`flex items-center gap-3 ${isActive ? 'bg-accent/10' : ''}`}
              >
                {h === 'online' ? (
                  <CheckCircle size={14} className="text-green-400 shrink-0" weight="fill" />
                ) : h === 'offline' ? (
                  <XCircle size={14} className="text-red-400 shrink-0" weight="fill" />
                ) : (
                  <Circle size={14} className="text-text-muted shrink-0" />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium">
                    {s.name} {s.isPrimary ? '(primary)' : '(backup)'}
                  </span>
                  <span className="text-xs text-text-muted truncate">{s.ip}</span>
                </div>
                {isActive ? <span className="text-xs text-accent">активен</span> : null}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => window.dispatchEvent(new CustomEvent('settings:open'))}
            className="text-xs text-text-muted"
          >
            Настроить серверы...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
