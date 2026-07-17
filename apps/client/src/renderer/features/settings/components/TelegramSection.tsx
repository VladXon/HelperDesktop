import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, CheckCircle, TelegramLogo, ArrowSquareOut } from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { Button } from '../../../components/ui/button';
import { telegramLinkCheck, telegramLinkCode, telegramStatus, telegramUnlink } from '../api';

export function TelegramSection(): React.JSX.Element {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['telegram', 'status'], queryFn: telegramStatus });
  const [code, setCode] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef<boolean>(false);

  useEffect(() => {
    if (!code) return;
    setChecking(true);
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await telegramLinkCheck(code);
        if (!mounted) return;
        if (res.status === 'linked' || res.status === 'expired' || res.status === 'not_found') {
          setCode(null);
          setQrDataUrl(null);
          setDeepLink(null);
          setChecking(false);
          cancelledRef.current = true;
          await qc.invalidateQueries({ queryKey: ['telegram', 'status'] });
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    }, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [code, qc]);

  const onLink = async (): Promise<void> => {
    setError(null);
    cancelledRef.current = false;
    try {
      const res = await telegramLinkCode();
      setCode(res.code);
      const link = res.deepLink || `https://t.me/DesktopHelperIOBot?start=link_${res.code}`;
      setDeepLink(link);
      if (!cancelledRef.current) {
        try {
          const cvs = document.createElement('canvas');
          await QRCode.toCanvas(cvs, link, { width: 220, margin: 2 });
          if (!cancelledRef.current) setQrDataUrl(cvs.toDataURL());
        } catch (e) {
          console.error('QR generation failed:', e);
          setError('QR: ' + (e as Error).message);
        }
      }
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
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-bg-secondary p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} weight="fill" />
            <span className="text-sm font-medium text-text-primary">Telegram привязан</span>
          </div>
          {status.data.telegramId ? (
            <p className="mt-1 text-xs text-text-muted">ID: {status.data.telegramId}</p>
          ) : null}
        </div>
        <Button variant="destructive" onClick={onUnlink} className="w-full">Отвязать</Button>
        {error ? <p className="text-xs text-red-400 text-center">{error}</p> : null}
      </div>
    );
  }

  if (code) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-bg-secondary p-5">
          <div className="flex items-center gap-2">
            <TelegramLogo size={16} weight="fill" className="text-accent" />
            <span className="text-sm font-medium text-text-primary">Привязка Telegram</span>
          </div>

          <div className="mt-5 flex flex-col items-center gap-4">
            <div
              className="overflow-hidden rounded-xl border border-border bg-black/20 p-3"
              style={{ minHeight: 196, minWidth: 196 }}
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR код" className="h-[180px] w-[180px]" />
              ) : (
                <div className="flex h-[180px] w-[180px] items-center justify-center text-xs text-text-muted">
                  Загрузка QR...
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <span className="font-mono text-2xl font-bold tracking-[0.2em] text-accent">
                {code}
              </span>
              <button
                onClick={onCopy}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:text-text-primary"
                title="Скопировать"
              >
                {copied ? (
                  <CheckCircle size={14} weight="fill" className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              1. Отсканируйте QR или нажмите кнопку ниже
            </div>
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              2. Подтвердите привязку в Telegram
            </div>
          </div>

          {deepLink ? (
            <button
              onClick={() => window.api.shell.openExternal(deepLink)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <TelegramLogo size={16} weight="fill" />
              Открыть в Telegram
              <ArrowSquareOut size={14} />
            </button>
          ) : null}

          {checking ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Ожидание подтверждения...
            </div>
          ) : null}
        </div>

        <Button variant="outline" onClick={() => { setCode(null); setQrDataUrl(null); setDeepLink(null); setChecking(false); setError(null); cancelledRef.current = true; }} className="w-full">Отмена</Button>

        {error ? <p className="text-xs text-red-400 text-center">{error}</p> : null}
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
