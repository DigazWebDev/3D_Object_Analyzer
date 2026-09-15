import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './client';

export interface AnonymousIdentity {
  userId: string;
  isAnonymous: boolean;
}

export interface AuthBootstrapResult {
  session: Session | null;
  identity: AnonymousIdentity | null;
}

function identityFromUser(user: User | null): AnonymousIdentity | null {
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    isAnonymous: user.is_anonymous ?? false,
  };
}

/**
 * Restores an existing session or creates an anonymous one when online.
 *
 * Anonymous identities are device-session identities. A reinstall or cleared
 * app data can lose access to that identity until account linking is added.
 */
export async function restoreOrCreateAnonymousSession(): Promise<AuthBootstrapResult> {
  if (!supabase) {
    return { session: null, identity: null };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (session) {
    return {
      session,
      identity: identityFromUser(session.user),
    };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }

  return {
    session: data.session,
    identity: identityFromUser(data.user),
  };
}

export function getIdentityFromSession(session: Session | null): AnonymousIdentity | null {
  return identityFromUser(session?.user ?? null);
}
