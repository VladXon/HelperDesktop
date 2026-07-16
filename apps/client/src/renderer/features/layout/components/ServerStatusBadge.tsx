import * as React from 'react';
import { CircleNotch, CheckCircle, XCircle } from '@phosphor-icons/react';
import { useServerHealth } from '../hooks/useServerHealth';

export function ServerStatusBadge({ onClick }: { onClick?: () => void }): React.JSX.Element {
  const { state, lastCheck } = useServerHealth();

  const Icon = state === 'online' ? CheckCircle : state === 'offline' ? XCircle : CircleNotch;
  const label = state === 'online' ? 'Сервер доступен' : state === 'offline' ? 'Сервер недоступен' : 'Проверка...';
  const color = state === 'online' ? 'text-green-400' : state === 'offline' ? 'text-red-400' : 'text-text-muted';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 text-xs ${color} hover:opacity-80`}
      title={lastCheck ? `Последняя проверка: ${new Date(lastCheck).toLocaleTimeString()}` : undefined}
    >
      <Icon size={14} weight="fill" />
      <span>{label}</span>
    </button>
  );
}
