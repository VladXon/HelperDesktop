import type * as React from 'react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useDevCommands } from '../hooks/useDevCommands';

interface ConsoleLine {
  type: 'cmd' | 'out' | 'err';
  text: string;
}

export function DevConsole(): React.JSX.Element {
  const { info, restart, op } = useDevCommands();
  const [output, setOutput] = useState<ConsoleLine[]>([]);
  const [cmd, setCmd] = useState<string>('');

  const append = (line: ConsoleLine): void => setOutput((o) => [...o, line]);

  const onCommand = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmed = cmd.trim();
    if (!trimmed) return;
    append({ type: 'cmd', text: `> ${trimmed}` });
    setCmd('');
    const parts = trimmed.split(/\s+/);
    const head = parts[0];
    try {
      if (head === '/serverinfo') {
        const result = await info.refetch();
        if (result.data) append({ type: 'out', text: JSON.stringify(result.data, null, 2) });
        else append({ type: 'err', text: 'Ошибка получения информации' });
      } else if (head === '/restart') {
        append({ type: 'out', text: 'Запрошен перезапуск сервера' });
        await restart.mutateAsync();
      } else if (head === '/op' && parts[1]) {
        await op.mutateAsync(parts[1]);
        append({ type: 'out', text: `Пользователь ${parts[1]} помечен как разработчик` });
      } else {
        append({ type: 'err', text: 'Неизвестная команда. Доступно: /serverinfo /restart /op <login>' });
      }
    } catch (err) {
      append({ type: 'err', text: (err as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Серверная консоль</Label>
      <div className="min-h-[160px] max-h-[240px] overflow-y-auto rounded-md border border-border bg-bg-primary p-2 font-mono text-xs">
        {output.length === 0 ? <div className="text-text-muted">Вывод появится здесь</div> : null}
        {output.map((l, i) => (
          <div
            key={i}
            className={
              l.type === 'cmd' ? 'text-accent' : l.type === 'err' ? 'text-red-400' : 'text-text-secondary'
            }
          >
            {l.text}
          </div>
        ))}
      </div>
      <form onSubmit={onCommand} className="flex items-center gap-2">
        <Input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="/serverinfo, /restart, /op <login>"
          className="flex-1 font-mono"
        />
        <Button type="submit">Выполнить</Button>
      </form>
    </div>
  );
}
