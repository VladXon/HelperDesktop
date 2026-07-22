import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { Plug, X, ArrowCircleDown, Key } from '@phosphor-icons/react';

interface CharacterInfo {
  name: string;
  league: string;
  class: string;
  level: number;
}

interface PoeAccountPanelProps {
  onImportCharacter?: (name: string) => void;
  isImporting?: boolean;
}

export function PoeAccountPanel({ onImportCharacter, isImporting }: PoeAccountPanelProps): React.JSX.Element {
  const [session, setSession] = useState<{ configured: boolean; valid: boolean; accountName: string | null } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [fetchingChars, setFetchingChars] = useState(false);
  const [charError, setCharError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const s = await window.api.poe.getSession();
      setSession(s);
      if (s.configured && s.valid) {
        loadLocalCharacters();
      }
    } catch {
      setSession(null);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const loadLocalCharacters = async () => {
    setFetchingChars(true);
    setCharError(null);
    try {
      const result = await window.api.poe.fetchCharacters();
      const chars = (result as CharacterInfo[]) ?? [];
      setCharacters(chars);
      if (chars.length > 0 && !selectedCharacter) {
        setSelectedCharacter(chars[0]!.name);
      }
    } catch {
      setCharError('Failed to fetch characters');
    } finally {
      setFetchingChars(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleOpenSession = () => {
    window.dispatchEvent(new CustomEvent('poe:open-session'));
  };

  const handleDisconnect = async () => {
    try {
      await window.api.poe.clearSession();
      setSession(null);
      setCharacters([]);
    } catch {
      void 0;
    }
  };

  const handleRefresh = () => {
    loadLocalCharacters();
  };

  const handleImport = () => {
    if (!selectedCharacter) return;
    onImportCharacter?.(selectedCharacter);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">Path of Exile Account</h3>

      {sessionLoading ? (
        <p className="text-body-md text-text-muted animate-pulse">Loading session...</p>
      ) : session?.configured ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${session.valid ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span className="text-body-md text-text-primary">{session.accountName ?? 'Connected'}</span>
              <span className={`text-label-sm px-2 py-0.5 rounded ${session.valid ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                {session.valid ? 'Active' : 'Expired'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="p-1.5 rounded hover:bg-red-400/10 text-text-muted hover:text-red-400 transition-colors"
              title="Disconnect"
            >
              <X size={16} />
            </button>
          </div>

          <div className="border-t border-white/5 pt-3">
            {fetchingChars ? (
              <p className="text-body-sm text-text-muted animate-pulse">Fetching characters...</p>
            ) : charError ? (
              <div className="space-y-2">
                <p className="text-body-sm text-red-400">{charError}</p>
                <Button onClick={handleRefresh} variant="outline" size="sm">Retry</Button>
              </div>
            ) : characters.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-label-sm text-text-muted">Characters</label>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="text-label-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <select
                  value={selectedCharacter}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                  className="w-full p-2 rounded-lg border border-white/10 bg-white/[0.05] text-body-md text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
                >
                  {characters.map((ch) => (
                    <option key={ch.name} value={ch.name} className="bg-surface-dark text-text-primary">
                      Level {ch.level} {ch.class} — {ch.name} ({ch.league})
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleImport}
                  disabled={!selectedCharacter || isImporting}
                  variant="default"
                  size="sm"
                  className="gap-2 w-full"
                >
                  <ArrowCircleDown size={16} />
                  {isImporting ? 'Importing...' : 'Import Character'}
                </Button>
              </div>
            ) : (
              <p className="text-body-sm text-text-muted">No characters found</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <Key size={24} className="text-text-muted" />
          <p className="text-body-md text-text-muted text-center">Connect your PoE account to import characters directly</p>
          <Button onClick={handleOpenSession} variant="outline" size="sm" className="gap-2">
            <Plug size={16} /> Setup PoE Session
          </Button>
        </div>
      )}
    </div>
  );
}
