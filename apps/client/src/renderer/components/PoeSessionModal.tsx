import type * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Key, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

export function PoeSessionModal(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [poesessid, setPoesessid] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ configured: boolean; valid: boolean; accountName: string | null } | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const s = await window.api.poe.getSession();
      setSession(s);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      loadSession();
      setOpen(true);
    };
    window.addEventListener('poe:open-session', handler);
    return () => window.removeEventListener('poe:open-session', handler);
  }, [loadSession]);

  useEffect(() => {
    if (open) loadSession();
  }, [open, loadSession]);

  const handleSave = async () => {
    if (!poesessid.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await window.api.poe.connectSession(poesessid.trim());
      if (result.connected) {
        setPoesessid('');
        await loadSession();
      } else {
        setError('Invalid POESESSID — please copy a fresh one from pathofexile.com');
      }
    } catch {
      setError('Failed to validate session');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      await window.api.poe.clearSession();
      setSession(null);
    } catch {
      void 0;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PoE Session</DialogTitle>
          <DialogDescription>
            Connect your Path of Exile account to enable character import, stash viewing, and price checking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {session?.configured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  {session.valid ? (
                    <CheckCircle size={20} className="text-green-400" />
                  ) : (
                    <WarningCircle size={20} className="text-yellow-400" />
                  )}
                  <span className="text-body-md text-text-primary">{session.accountName ?? 'Connected'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-label-sm text-text-muted hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
              <Button onClick={() => setOpen(false)} variant="default" size="sm" className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-label-sm text-text-muted">
                Log in to pathofexile.com, open DevTools (F12) → Application → Cookies, copy the{' '}
                <code className="text-accent/80">POESESSID</code> value.
              </p>
              <div className="glass-input rounded-lg flex items-center h-10 px-4">
                <input
                  type="password"
                  value={poesessid}
                  onChange={(e) => setPoesessid(e.target.value)}
                  placeholder="Paste POESESSID..."
                  className="bg-transparent border-none outline-none text-body-md w-full text-text-primary placeholder:text-text-muted/40"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                />
              </div>
              {error && <p className="text-label-sm text-red-400">{error}</p>}
              <Button onClick={handleSave} disabled={!poesessid.trim() || saving} variant="default" size="sm" className="w-full gap-2">
                <Key size={16} />
                {saving ? 'Validating...' : 'Connect'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
