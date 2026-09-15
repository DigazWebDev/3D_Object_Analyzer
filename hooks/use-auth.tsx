import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getIdentityFromSession,
  restoreOrCreateAnonymousSession,
  type AnonymousIdentity,
} from '@/services/supabase/auth-service';
import { isSupabaseConfigured, supabase } from '@/services/supabase/client';

export type AuthStatus = 'loading' | 'authenticated' | 'local-only' | 'offline';

interface AuthContextValue {
  status: AuthStatus;
  identity: AnonymousIdentity | null;
  userId: string | null;
  errorMessage: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'local-only');
  const [identity, setIdentity] = useState<AnonymousIdentity | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      const nextIdentity = getIdentityFromSession(session);
      setIdentity(nextIdentity);
      if (nextIdentity) {
        setStatus('authenticated');
        setErrorMessage(null);
      } else {
        setStatus('offline');
      }
    });

    void restoreOrCreateAnonymousSession()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setIdentity(result.identity);
        setStatus(result.identity ? 'authenticated' : 'offline');
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setIdentity(null);
        setStatus('offline');
        setErrorMessage(error instanceof Error ? error.message : 'Supabase authentication failed.');
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      identity,
      userId: identity?.userId ?? null,
      errorMessage,
    }),
    [errorMessage, identity, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
