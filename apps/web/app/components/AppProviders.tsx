'use client';

import type { ReactNode } from 'react';
import { AppPreferencesProvider } from '../../src/app/providers/AppPreferencesProvider';
import { SupabaseAuthProvider } from '../../src/app/providers/SupabaseAuthProvider';
import { WatchedBoardsProvider } from '../../src/features/game/providers/WatchedBoardsProvider';
import { NotificationsProvider } from '../../src/features/notifications/NotificationsProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return <SupabaseAuthProvider><AppPreferencesProvider><NotificationsProvider><WatchedBoardsProvider>{children}</WatchedBoardsProvider></NotificationsProvider></AppPreferencesProvider></SupabaseAuthProvider>;
}
