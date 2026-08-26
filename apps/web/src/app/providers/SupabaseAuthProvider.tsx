'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/shared/api/supabase-client';
import type { PlayerProfile } from '@/shared/auth/player-profile';
import { usernameLoginEmail } from '@/shared/auth/username-credentials';

type AuthStatus = 'loading' | 'ready' | 'error';

interface SupabaseAuthContextValue {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  error: Error | null;
  isAnonymous: boolean;
  createUsernameAccount: (credentials: { username: string; password: string; captchaSolution: 'b4' }) => Promise<void>;
  signInWithUsername: (credentials: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updatePlayerProfile: (profile: PlayerProfile) => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

let sessionInitialization: Promise<Session | null> | null = null;

async function getOrCreateAnonymousSession(): Promise<Session | null> {
  const { data: existingSession, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (existingSession.session) return existingSession.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

function initializeSession(): Promise<Session | null> {
  sessionInitialization ??= getOrCreateAnonymousSession();
  return sessionInitialization;
}

export function SupabaseAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<Error | null>(null);

  async function signInWithUsername({ username, password }: { username: string; password: string }): Promise<void> {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameLoginEmail(username),
      password,
    });
    if (signInError) throw new Error('Username or password is incorrect.');
  }

  async function createUsernameAccount({ username, password, captchaSolution }: { username: string; password: string; captchaSolution: 'b4' }): Promise<void> {
    if (!session?.access_token) throw new Error('Your session is no longer available. Please refresh and try again.');
    const response = await fetch('/api/v1/auth/upgrade', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, captchaSolution }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? 'Your account could not be created.');
    }
    await signInWithUsername({ username, password });
  }

  async function signOut(): Promise<void> {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    sessionInitialization = null;
    const nextSession = await getOrCreateAnonymousSession();
    sessionInitialization = Promise.resolve(nextSession);
  }

  async function updatePlayerProfile(profile: PlayerProfile): Promise<void> {
    if (!session?.access_token) throw new Error('Your session is no longer available. Please refresh and try again.');
    const response = await fetch('/api/v1/players/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: profile.displayName.trim() }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? 'Your profile could not be saved.');
    }
    const { error: updateError } = await supabase.auth.updateUser({
      data: { display_name: profile.displayName.trim(), profile_piece: profile.piece, profile_color: profile.color },
    });
    if (updateError) throw updateError;
  }

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus('ready');
      setError(null);
    });

    void initializeSession()
      .then((nextSession) => {
        setSession(nextSession);
        setStatus('ready');
      })
      .catch((authenticationError: unknown) => {
        setError(authenticationError instanceof Error ? authenticationError : new Error('Anonymous sign-in failed.'));
        setStatus('error');
      });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<SupabaseAuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    status,
    error,
    isAnonymous: session?.user.is_anonymous === true,
    createUsernameAccount,
    signInWithUsername,
    signOut,
    updatePlayerProfile,
  }), [error, session, status]);

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const context = useContext(SupabaseAuthContext);
  if (!context) throw new Error('useSupabaseAuth must be used inside SupabaseAuthProvider.');
  return context;
}
