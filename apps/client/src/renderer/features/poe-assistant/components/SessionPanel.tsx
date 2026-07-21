import type * as React from 'react';
import { useState } from 'react';
import { Key, X, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { usePoeSession, useCharacters } from '../hooks/usePoeQueries';
import * as api from '../api';

export function SessionPanel(): React.JSX.Element {
  const { data: session, isLoading, refetch } = usePoeSession();
  const [poesessid, setPoesessid] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (): Promise<void> => {
    if (!poesessid.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api.setSession(poesessid.trim());
      if (result.valid) {
        await refetch();
        setPoesessid('');
      } else {
        setError('Invalid POESESSID — please copy a fresh one from pathofexile.com');
      }
    } catch {
      setError('Failed to validate session');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (): Promise<void> => {
    await api.clearSession();
    await refetch();
  };

  return (
    <div className="px-6 py-4 border-b border-white/5">
      {isLoading ? (
        <div className="text-text-muted text-body-md animate-pulse">Loading session...</div>
      ) : session?.configured ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session.valid ? (
              <CheckCircle size={20} className="text-green-400" />
            ) : (
              <WarningCircle size={20} className="text-yellow-400" />
            )}
            <div>
              <span className="text-body-md text-text-primary font-medium">PoE Session</span>
              <span className="text-label-sm text-text-muted ml-3">{session.accountName ?? 'Unknown'}</span>
            </div>
            <span className={`text-label-sm px-2 py-0.5 rounded ${session.valid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
              {session.valid ? 'Active' : 'Expired'}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-text-muted hover:text-red-400">
            <X size={16} className="mr-1" /> Disconnect
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Key size={20} className="text-text-muted" />
            <span className="text-body-md text-text-primary font-medium">Setup PoE Session</span>
            <span className="text-label-sm text-text-muted">(optional — for character & stash data)</span>
          </div>
          <p className="text-label-sm text-text-muted mb-3">
            Log in to pathofexile.com, open DevTools (F12) → Application → Cookies, copy the <code className="text-accent/80">POESESSID</code> value.
          </p>
          <div className="flex gap-3">
            <div className="glass-input rounded-lg flex items-center h-10 px-4 flex-1">
              <input
                type="password"
                value={poesessid}
                onChange={(e) => setPoesessid(e.target.value)}
                placeholder="Paste POESESSID..."
                className="bg-transparent border-none outline-none text-body-md w-full text-text-primary placeholder:text-text-muted/40"
              />
            </div>
            <Button onClick={handleSave} disabled={!poesessid.trim() || saving} className="gap-2">
              {saving ? 'Validating...' : 'Connect'}
            </Button>
          </div>
          {error ? <p className="text-label-sm text-red-400 mt-2">{error}</p> : null}
        </div>
      )}
    </div>
  );
}

export function CharacterViewer(): React.JSX.Element {
  const { data: session } = usePoeSession();
  const { data: characters, isLoading, error } = useCharacters();

  if (!session?.configured || !session?.valid) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Connect a PoE session to view characters
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-text-muted animate-pulse">Loading characters...</div>;
  }

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-red-400">Failed to load characters</div>;
  }

  const chars = characters as Array<Record<string, unknown>> | undefined;

  return (
    <div className="flex-1 overflow-auto p-6">
      {!chars || chars.length === 0 ? (
        <div className="text-center text-text-muted">No characters found</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {chars.map((char, i) => (
            <div key={i} className="glass-panel rounded-lg p-4 hover:bg-white/[0.04] transition-colors">
              <div className="text-body-md text-text-primary font-medium">{char.name as string}</div>
              <div className="text-label-sm text-text-muted mt-1">
                <span>Level {char.level as number} {char.class as string}</span>
              </div>
              <div className="text-label-sm text-text-muted">{char.league as string}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
