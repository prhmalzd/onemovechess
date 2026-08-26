'use client';

import type { ReactNode } from 'react';
import { AppPreferencesProvider } from '../../src/app/providers/AppPreferencesProvider';
import { SupabaseAuthProvider } from '../../src/app/providers/SupabaseAuthProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return <SupabaseAuthProvider><AppPreferencesProvider>{children}</AppPreferencesProvider></SupabaseAuthProvider>;
}
