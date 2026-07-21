import type * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Plug, X, ArrowCircleDown } from '@phosphor-icons/react';

interface PoeAccountInfo {
  id: number;
  accountName: string;
  connected: boolean;
}

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
  const [accounts, setAccounts] = useState<PoeAccountInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [fetchingChars, setFetchingChars] = useState(false);
  const [charError, setCharError] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const list = await window.api.poe.getAccounts();
      setAccounts(list);
    } catch {
      void 0;
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    setFetchingChars(true);
    setCharError(null);
    try {
      const result = await window.api.poe.fetchOAuthCharacters();
      setCharacters(result.characters ?? []);
      if (result.characters && result.characters.length > 0 && !selectedCharacter) {
        setSelectedCharacter(result.characters[0]!.name);
      }
    } catch {
      setCharError('Failed to fetch characters');
    } finally {
      setFetchingChars(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      loadCharacters();
    } else {
      setCharacters([]);
      setSelectedCharacter('');
    }
  }, [accounts.length]);

  const handleConnect = async () => {
    try {
      await window.api.poe.connectAccount();
      setTimeout(loadAccounts, 2000);
    } catch {
      void 0;
    }
  };

  const handleDisconnect = async (id: number) => {
    try {
      await window.api.poe.disconnectAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      void 0;
    }
  };

  const handleRefresh = () => {
    loadCharacters();
  };

  const handleImport = () => {
    if (!selectedCharacter) return;
    onImportCharacter?.(selectedCharacter);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">Path of Exile Account</h3>

      {loading ? (
        <p className="text-body-md text-text-muted animate-pulse">Loading...</p>
      ) : accounts.length > 0 ? (
        <div className="space-y-4">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-body-md text-text-primary">{a.accountName}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDisconnect(a.id)}
                className="p-1.5 rounded hover:bg-red-400/10 text-text-muted hover:text-red-400 transition-colors"
                title="Disconnect"
              >
                <X size={16} />
              </button>
            </div>
          ))}

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
          <Plug size={24} className="text-text-muted" />
          <p className="text-body-md text-text-muted text-center">Connect your PoE account to import characters directly</p>
          <Button onClick={handleConnect} variant="outline" size="sm" className="gap-2">
            Connect Path of Exile
          </Button>
        </div>
      )}
    </div>
  );
}
