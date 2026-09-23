import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/endpoints';
import { ApiError, tokens } from '@/api/client';
import type { AuthSession, UserProfile } from '@/api/types';

interface AuthValue {
  user: UserProfile | null;
  /** True until the boot-time /auth/me has settled, so guards do not flash. */
  loading: boolean;
  signedIn: boolean;
  login: (identifier: string, password: string) => Promise<UserProfile>;
  register: (body: { email: string; username: string; name: string; password: string }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Rehydrate the session on boot. A stored refresh token is enough — the
  // client transparently exchanges it if the access token has expired.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tokens.access && !tokens.refresh) {
        setLoading(false);
        return;
      }
      try {
        const profile = await authApi.me();
        if (!cancelled) setUser(profile);
      } catch (error) {
        // Only a genuine auth failure should clear the session; a cold-starting
        // or unreachable server must not sign the user out.
        if (error instanceof ApiError && error.isAuth) tokens.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const adopt = useCallback((session: AuthSession) => {
    tokens.save(session.tokens.accessToken, session.tokens.refreshToken);
    setUser(session.user);
    queryClient.clear();
    return session.user;
  }, [queryClient]);

  const login = useCallback(
    async (identifier: string, password: string) => adopt(await authApi.login({ identifier, password })),
    [adopt],
  );

  const register = useCallback(
    async (body: { email: string; username: string; name: string; password: string }) =>
      adopt(await authApi.register(body)),
    [adopt],
  );

  const logout = useCallback(async () => {
    const refresh = tokens.refresh;
    // Revoke server-side, but never block sign-out on the network.
    if (refresh) await authApi.logout(refresh).catch(() => undefined);
    tokens.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch { /* keep the stale profile rather than blanking the UI */ }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, signedIn: !!user, login, register, logout, setUser, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
