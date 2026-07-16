import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export type HealthState = 'unknown' | 'online' | 'offline';

export function useServerHealth(): { state: HealthState; lastCheck: string | null } {
  const [state, setState] = useState<HealthState>('unknown');
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const probe = useQuery({
    queryKey: ['server', 'health'],
    queryFn: async () => {
      const result = await window.api.server.test();
      return result;
    },
    refetchInterval: 30_000,
    retry: 0,
  });

  useEffect(() => {
    if (probe.isSuccess) {
      setState('online');
      setLastCheck(probe.data?.timestamp ?? new Date().toISOString());
    } else if (probe.isError) {
      setState('offline');
    }
  }, [probe.isSuccess, probe.isError, probe.data]);

  useEffect(() => {
    const unsubscribe = window.api.server.onHealth((msg) => {
      const m = msg as { type?: string; timestamp?: string };
      if (m.type === 'connected' || m.type === 'health') {
        setState('online');
        if (m.timestamp) setLastCheck(m.timestamp);
      } else if (m.type === 'disconnected') {
        setState('offline');
      }
    });
    return () => unsubscribe();
  }, []);

  return { state, lastCheck };
}
