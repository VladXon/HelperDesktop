import * as React from 'react';
import type { User, TokenData } from '@helper/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setSession: (token: TokenData) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const refresh = React.useCallback(async () => {
    try {
      const me = await window.api.auth.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await window.api.auth.getMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setSession = React.useCallback(async (token: TokenData) => {
    await window.api.auth.saveToken(token.user.login, {
      token: token.token,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      user: token.user,
    });
    setUser(token.user);
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await window.api.auth.logout();
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({ user, isAuthenticated: Boolean(user), loading, setSession, logout, refresh }),
    [user, loading, setSession, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
