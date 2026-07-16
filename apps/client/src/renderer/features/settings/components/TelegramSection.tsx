import * as React from 'react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, CheckCircle, TelegramLogo } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
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
        <div className="overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 via-transparent to-accent/5 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-accent">
            <TelegramLogo size={18} weight="fill" />
            <span className="text-label-sm font-semibold">Привязка Telegram</span>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-accent/20 blur-sm" />
              <div className="relative flex items-center gap-3 rounded-lg border border-accent/20 bg-black/40 px-6 py-4">
                <span className="font-mono text-3xl font-bold tracking-[0.25em] text-accent">
                  {code}
                </span>
                <button
                  onClick={onCopy}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
                  title="Скопировать"
                >
                  {copied ? (
                    <CheckCircle size={16} weight="fill" className="text-green-400" />
                  ) : (
                    <Copy size={16} className="text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] text-accent">1</span>
            Отправьте код в Telegram-бот
            <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">/link</span>
          </div>

          {checking ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              Ожидание подтверждения...
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCode(null)} className="flex-1">Отмена</Button>
        </div>

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
