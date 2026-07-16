import * as React from 'react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, CheckCircle } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { telegramLinkCheck, telegramLinkCode, telegramStatus, telegramUnlink } from '../api';

export function TelegramSection(): React.JSX.Element {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['telegram', 'status'], queryFn: telegramStatus });
  const [code, setCode] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let mounted = true;
    const interval = setInterval(async () => {
      setChecking(true);
      try {
        const res = await telegramLinkCheck(code);
        if (!mounted) return;
        if (res.status === 'linked' || res.status === 'expired' || res.status === 'not_found') {
          setCode(null);
          await qc.invalidateQueries({ queryKey: ['telegram', 'status'] });
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setChecking(false);
      }
    }, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [code, qc]);

  const onLink = async (): Promise<void> => {
    setError(null);
    try {
      const res = await telegramLinkCode();
      setCode(res.code);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onCopy = async (): Promise<void> => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onUnlink = async (): Promise<void> => {
    if (!confirm('Отвязать Telegram?')) return;
    try {
      await telegramUnlink();
      await qc.invalidateQueries({ queryKey: ['telegram', 'status'] });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (status.data?.linked) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} weight="fill" />
            Telegram привязан
          </div>
          {status.data.telegramId ? (
            <div className="mt-1 text-xs text-text-muted">ID: {status.data.telegramId}</div>
          ) : null}
        </div>
        <Button variant="destructive" onClick={onUnlink}>Отвязать</Button>
        {error ? <div className="text-xs text-red-400">{error}</div> : null}
      </div>
    );
  }

  if (code) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm p-4">
          <Label>Код для привязки</Label>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-center font-mono text-lg tracking-widest">
              {code}
            </div>
            <Button variant="outline" size="icon" onClick={onCopy} title="Скопировать">
              {copied ? <CheckCircle size={16} weight="fill" className="text-green-400" /> : <Copy size={16} />}
            </Button>
          </div>
          <div className="mt-3 text-xs text-text-muted">
            Откройте Telegram-бот, отправьте команду /link и введите этот код.
          </div>
          {checking ? <div className="mt-1 text-xs text-text-muted">Ожидание...</div> : null}
        </div>
        <Button variant="outline" onClick={() => setCode(null)}>Отмена</Button>
        {error ? <div className="text-xs text-red-400">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-body-md text-text-muted">Telegram не привязан</p>
      <Button onClick={onLink} className="w-full py-3.5">Привязать</Button>
      {error ? <div className="text-xs text-red-400">{error}</div> : null}
    </div>
  );
}
