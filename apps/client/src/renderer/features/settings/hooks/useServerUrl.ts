import { useEffect, useState } from 'react';
import { getServerUrl, setServerUrl, testServer } from '../api';

export function useServerUrl(): { url: string; setUrl: (v: string) => void; status: 'unknown' | 'online' | 'offline'; version: string | null; check: () => Promise<void>; save: () => Promise<void>; saving: boolean } {
  const [url, setLocalUrl] = useState<string>('');
  const [status, setStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [version, setVersion] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    void getServerUrl().then(setLocalUrl);
  }, []);

  const setUrl = (v: string): void => setLocalUrl(v);

  const check = async (): Promise<void> => {
    try {
      const r = await testServer();
      setStatus('online');
      setVersion(r.version);
    } catch {
      setStatus('offline');
      setVersion(null);
    }
  };

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await setServerUrl(url);
      await check();
    } finally {
      setSaving(false);
    }
  };

  return { url, setUrl, status, version, check, save, saving };
}
