import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { ArrowsClockwise, CloudArrowDown, WarningCircle, Plug } from '@phosphor-icons/react';

interface CharacterSummary {
  id: number;
  name: string;
  level: number;
  class: string;
  ascendancy: string | null;
  league: string;
  lastSync: string;
}

type SyncState = 'idle' | 'syncing' | 'error' | 'session_expired' | 'rate_limited' | 'ggg_unavailable';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CharacterPanel(): React.JSX.Element {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [retryAfter, setRetryAfter] = useState<number>(0);

  const loadCharacters = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const list = await window.api.poe.listCharacters();
      setCharacters(list);
      setSyncState('idle');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? String(err);
      if (msg.includes('no_account') || msg.includes('No PoE account')) {
        setSyncState('idle');
      } else {
        setSyncError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Characters loaded manually via Sync button only
  }, []);

  const handleSync = async () => {
    setSyncState('syncing');
    setSyncError(null);
    try {
      const list = await window.api.poe.syncCharacters();
      setCharacters(list);
      setSyncState('idle');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? String(err);
      if (msg.includes('session_expired')) {
        setSyncState('session_expired');
        setSyncError('PoE session expired — reconnect your account.');
      } else if (msg.includes('rate_limited') || msg.includes('rate limit')) {
        setSyncState('rate_limited');
        const match = msg.match(/retry after (\d+)/i);
        const secs = match ? parseInt(match[1]!, 10) : 60;
        setRetryAfter(secs);
        setSyncError(`GGG rate limited. Retry after ${secs}s.`);
      } else if (msg.includes('ggg_unavailable') || msg.includes('unavailable')) {
        setSyncState('ggg_unavailable');
        setSyncError('Path of Exile services unavailable — try again later.');
      } else {
        setSyncState('error');
        setSyncError(msg);
      }
    }
  };

  const handleRefresh = async (id: number) => {
    setRefreshingId(id);
    try {
      await window.api.poe.refreshCharacter(id);
      await loadCharacters();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? String(err);
      if (msg.includes('session_expired')) {
        setSyncState('session_expired');
        setSyncError('PoE session expired — reconnect your account.');
      } else {
        setSyncError(msg);
        setSyncState('error');
      }
    } finally {
      setRefreshingId(null);
    }
  };

  useEffect(() => {
    if (syncState === 'rate_limited' && retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [syncState, retryAfter]);

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-body-md text-text-muted animate-pulse">Loading characters...</span>
          </div>
        </div>
      </div>
    );
  }

  if (syncState === 'session_expired') {
    return (
      <div className="rounded-lg border border-red-400/20 bg-red-400/[0.03] backdrop-blur-xl p-6">
        <div className="flex flex-col items-center gap-3 py-6">
          <WarningCircle size={32} className="text-red-400" />
          <p className="text-body-md text-red-400">{syncError}</p>
          <p className="text-label-sm text-text-muted">Reconnect in PoeAssistant → Session Panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-headline-md font-semibold text-text-primary">
          Characters
          {characters.length > 0 && (
            <span className="text-label-sm text-text-muted ml-2 font-normal">({characters.length})</span>
          )}
        </h3>
        <Button
          onClick={handleSync}
          disabled={syncState === 'syncing'}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <CloudArrowDown size={16} className={syncState === 'syncing' ? 'animate-spin' : ''} />
          {syncState === 'syncing' ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      {(syncState === 'rate_limited' || syncState === 'ggg_unavailable' || syncState === 'error') && syncError && (
        <div className="mb-4 rounded-lg border border-yellow-400/20 bg-yellow-400/[0.05] p-4">
          <div className="flex items-start gap-3">
            <WarningCircle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-body-sm text-yellow-400">{syncError}</p>
              <div className="flex gap-2 mt-2">
                {syncState === 'rate_limited' && (
                  <Button onClick={handleSync} disabled={retryAfter > 0} variant="ghost" size="sm" className="text-yellow-400">
                    {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Retry now'}
                  </Button>
                )}
                {syncState !== 'rate_limited' && (
                  <Button onClick={handleSync} variant="ghost" size="sm" className="text-yellow-400">
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {characters.length === 0 && syncState !== 'rate_limited' && syncState !== 'ggg_unavailable' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Plug size={28} className="text-text-muted" />
          <p className="text-body-md text-text-muted text-center">No characters synced yet</p>
          <p className="text-label-sm text-text-muted text-center">
            Click Sync to fetch characters from your connected PoE account
          </p>
        </div>
      )}

      <div className="space-y-2">
        {characters.map((ch) => (
          <div
            key={ch.id}
            className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body-md text-text-primary font-medium">{ch.name}</span>
                  <span className="text-label-sm px-2 py-0.5 rounded bg-white/[0.06] text-text-muted">
                    Level {ch.level}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-label-sm text-text-muted">
                    {ch.ascendancy ? ch.ascendancy : ch.class}
                  </span>
                  <span className="text-label-xs text-text-muted/50">·</span>
                  <span className="text-label-xs text-text-muted/50">{ch.league}</span>
                  <span className="text-label-xs text-text-muted/50">·</span>
                  <span className="text-label-xs text-text-muted/50">Synced {relativeTime(ch.lastSync)}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleRefresh(ch.id)}
              disabled={refreshingId === ch.id}
              variant="ghost"
              size="sm"
              className="text-text-muted hover:text-accent"
              title="Refresh from GGG"
            >
              <ArrowsClockwise
                size={16}
                className={refreshingId === ch.id ? 'animate-spin' : ''}
              />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
