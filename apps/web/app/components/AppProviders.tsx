'use client';

import type { ReactNode } from 'react';
import { AppPreferencesProvider } from '../../src/app/providers/AppPreferencesProvider';
import { SupabaseAuthProvider } from '../../src/app/providers/SupabaseAuthProvider';
import { WatchedBoardsProvider } from '../../src/features/game/providers/WatchedBoardsProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return <SupabaseAuthProvider><AppPreferencesProvider><WatchedBoardsProvider>{children}</WatchedBoardsProvider></AppPreferencesProvider></SupabaseAuthProvider>;
}
