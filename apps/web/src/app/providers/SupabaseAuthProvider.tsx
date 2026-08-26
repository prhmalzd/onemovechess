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

type AuthStatus = 'loading' | 'ready' | 'error';

interface SupabaseAuthContextValue {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  error: Error | null;
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
  }), [error, session, status]);

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const context = useContext(SupabaseAuthContext);
  if (!context) throw new Error('useSupabaseAuth must be used inside SupabaseAuthProvider.');
  return context;
}
