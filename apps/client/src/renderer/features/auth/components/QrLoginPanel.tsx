import * as React from 'react';
import { Button } from '../../../components/ui/button';
import { useQrLogin } from '../hooks/useQrLogin';
import { useAuth } from '../../../providers/AuthProvider';

export function QrLoginPanel(): React.JSX.Element {
  const { qrDataUrl, deepLink, error, status, approvedSession, request, cancel } = useQrLogin();
  const { setSession } = useAuth();
  const [opened, setOpened] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (status === 'approved' && approvedSession) {
      void setSession(approvedSession);
    }
  }, [status, approvedSession, setSession]);

  if (!opened) {
    return (
      <Button variant="outline" className="w-full" onClick={() => { setOpened(true); void request(); }}>
        Войти через Telegram
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-bg-secondary p-4">
      {status === 'pending' && qrDataUrl ? (
        <>
          <div className="rounded-md bg-white p-2">
            <img src={qrDataUrl} alt="QR-код" width={220} height={220} />
          </div>
          <div className="text-xs text-text-muted text-center">
            Откройте Telegram, отсканируйте код или перейдите по ссылке
          </div>
          {deepLink ? (
            <a href={deepLink} className="text-xs text-accent hover:underline break-all" target="_blank" rel="noreferrer">
              {deepLink}
            </a>
          ) : null}
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1" onClick={cancel}>Отмена</Button>
          </div>
        </>
      ) : null}
      {status === 'expired' ? (
        <div className="text-sm text-red-400">Код истёк. Запросите новый.</div>
      ) : null}
      {status === 'not_found' ? (
        <div className="text-sm text-red-400">Запрос не найден.</div>
      ) : null}
      {status === 'cancelled' ? (
        <div className="text-sm text-text-muted">Отменено</div>
      ) : null}
      {status === 'expired' || status === 'not_found' || status === 'cancelled' ? (
        <Button variant="outline" size="sm" onClick={() => { void request(); }}>Запросить новый</Button>
      ) : null}
      {error ? <div className="text-xs text-red-400">{error}</div> : null}
    </div>
  );
}
