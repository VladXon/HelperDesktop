import * as React from 'react';
import { CircleNotch, CheckCircle, XCircle, Cloud } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { useServerHealth } from '../hooks/useServerHealth';

interface VpsEntry {
  id: string;
  url: string;
  label: string;
}

const servers: VpsEntry[] = [
  { id: 'server1', url: 'http://178.172.137.167:3001', label: 'Сервер 1 — Belarus' },
  { id: 'server2', url: 'http://2.26.80.138:3001', label: 'Сервер 2 — Germany' },
];

type HealthStatus = 'online' | 'offline' | 'checking';

export function ServerStatusBadge(): React.JSX.Element {
  const currentHealth = useServerHealth();
  const [activeServer, setActiveServer] = React.useState<string>('server1');
  const [health, setHealth] = React.useState<Record<string, HealthStatus>>({});
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    window.api.settings.get('vps:active').then((v) => {
      if (typeof v === 'string') setActiveServer(v);
      setLoaded(true);
    });
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    window.api.server.setUrl(servers.find((s) => s.id === activeServer)!.url);
  }, [activeServer, loaded]);

  React.useEffect(() => {
    let mounted = true;
    const check = () => {
      for (const s of servers) {
        setHealth((prev) => ({ ...prev, [s.id]: 'checking' }));
        window.api.server.checkUrl(s.url).then((r) => {
          if (mounted) setHealth((prev) => ({ ...prev, [s.id]: r.status }));
        });
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const select = (id: string) => {
    if (id === activeServer) return;
    setActiveServer(id);
    window.api.settings.set('vps:active', id);
  };

  const currentStatus = health[activeServer] ?? currentHealth.state;
  const TriggerIcon = currentStatus === 'online' ? CheckCircle : currentStatus === 'offline' ? XCircle : CircleNotch;
  const triggerColor = currentStatus === 'online' ? 'text-green-400' : currentStatus === 'offline' ? 'text-red-400' : 'text-text-muted';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 text-xs ${triggerColor} hover:opacity-80`}
        >
          <Cloud size={12} className="text-text-muted" />
          <TriggerIcon size={12} weight="fill" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Серверы VPS</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {servers.map((s) => {
          const h = health[s.id] ?? 'checking';
          const isActive = s.id === activeServer;
          const Icon = h === 'online' ? CheckCircle : h === 'offline' ? XCircle : CircleNotch;
          const color = h === 'online' ? 'text-green-400' : h === 'offline' ? 'text-red-400' : 'text-text-muted';
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => select(s.id)}
              className={`flex items-center gap-3 ${isActive ? 'bg-accent/10' : ''}`}
            >
              <Icon size={14} className={`${color} shrink-0`} weight="fill" />
              <span className="text-sm font-medium flex-1">{s.label}</span>
              {isActive ? <span className="text-xs text-accent">✓</span> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
