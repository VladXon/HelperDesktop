import * as React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { useQrLogin } from '../hooks/useQrLogin';
import { useAuth } from '../../../providers/AuthProvider';

function isValidDeepLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'tg:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function QrLoginPanel(): React.JSX.Element {
  const { qrDataUrl, deepLink, tgDeepLink, error, status, approvedSession, request, cancel } = useQrLogin();
  const { setSession } = useAuth();
  const [opened, setOpened] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (status === 'approved' && approvedSession) {
      void setSession(approvedSession);
    }
  }, [status, approvedSession, setSession]);

  const handleOpen = (): void => {
    setOpened(true);
    void request();
  };

  const handleClose = (): void => {
    cancel();
    setOpened(false);
  };

  if (!opened) {
    return (
      <Button variant="outline" className="w-full gap-3 py-3" onClick={handleOpen}>
        Войти через Telegram
      </Button>
    );
  }

  return (
    <Dialog open={opened} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Вход через Telegram</DialogTitle>
        </DialogHeader>

        {status === 'pending' && qrDataUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg bg-white p-2">
              <img src={qrDataUrl} alt="QR-код" width={200} height={200} />
            </div>
            <p className="text-sm text-text-muted text-center">
              Отсканируйте QR-код в Telegram
            </p>
            {tgDeepLink && isValidDeepLink(tgDeepLink) ? (
              <Button
                variant="accent"
                className="w-full gap-2"
                onClick={() => window.api.shell.openExternal(tgDeepLink)}
              >
                Открыть в Telegram
              </Button>
            ) : deepLink && isValidDeepLink(deepLink) ? (
              <Button
                variant="accent"
                className="w-full gap-2"
                onClick={() => window.api.shell.openExternal(deepLink)}
              >
                Открыть в Telegram
              </Button>
            ) : null}
          </div>
        ) : null}

        {status === 'expired' ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-red-400">Код истёк</p>
            <Button variant="outline" size="sm" onClick={() => void request()}>Запросить новый</Button>
          </div>
        ) : null}

        {status === 'not_found' ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-red-400">Запрос не найден</p>
            <Button variant="outline" size="sm" onClick={() => void request()}>Запросить новый</Button>
          </div>
        ) : null}

        {status === 'cancelled' ? (
          <p className="text-sm text-text-muted text-center">Отменено</p>
        ) : null}

        {error ? <p className="text-xs text-red-400 text-center">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
