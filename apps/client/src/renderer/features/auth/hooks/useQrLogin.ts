import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import type { QrLoginStatus, TokenData } from '@helper/shared';

export type QrResultStatus = 'pending' | 'approved' | 'expired' | 'not_found' | 'cancelled';

export function useQrLogin(): {
  request: () => Promise<void>;
  cancel: () => void;
  isLoading: boolean;
  qrDataUrl: string | null;
  deepLink: string | null;
  tgDeepLink: string | null;
  error: string | null;
  expiresIn: number | null;
  status: QrResultStatus;
  approvedSession: TokenData | null;
} {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [status, setStatus] = useState<QrResultStatus>('pending');
  const [approvedSession, setApprovedSession] = useState<TokenData | null>(null);
  const cancelledRef = useRef<boolean>(false);

  const request = async (): Promise<void> => {
    cancelledRef.current = false;
    setError(null);
    setStatus('pending');
    setApprovedSession(null);
    try {
      const res = await window.api.telegram.qrLoginRequest();
      setToken(res.token);
      setDeepLink(res.deepLink);
      setTgDeepLink(res.tgDeepLink);
      setExpiresIn(res.expiresIn);
      const url = await QRCode.toDataURL(res.deepLink, { width: 220, margin: 1 });
      setQrDataUrl(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cancel = (): void => {
    cancelledRef.current = true;
    setStatus('cancelled');
  };

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const interval = setInterval(async () => {
      if (cancelledRef.current) return;
      try {
        const checkStatus: QrLoginStatus = await window.api.telegram.qrLoginCheck(token);
        if (!mounted) return;
        if (checkStatus.status === 'approved') {
          const session: TokenData = {
            token: checkStatus.session.token,
            refreshToken: checkStatus.session.refreshToken,
            expiresIn: checkStatus.session.expiresIn,
            user: checkStatus.session.user,
          };
          setApprovedSession(session);
          setStatus('approved');
          clearInterval(interval);
        } else if (checkStatus.status === 'expired' || checkStatus.status === 'not_found') {
          setStatus(checkStatus.status);
          clearInterval(interval);
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
      }
    }, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [token]);

  return {
    request,
    cancel,
    isLoading: false,
    qrDataUrl,
    deepLink,
    tgDeepLink,
    error,
    expiresIn,
    status,
    approvedSession,
  };
}

export function useLoginMutation() {
  return useMutation({ mutationFn: ({ login, password }: { login: string; password: string }) => window.api.auth.login(login, password) });
}
