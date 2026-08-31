'use client';

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { gameApiRepository } from '@/features/game/api/game-api-repository';
import type { PlayerNotification } from '@/features/game/model/game.types';

type NotificationsContextValue = { notifications: PlayerNotification[]; unreadCount: number; markRead: (notificationId: string) => void };
const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { session, isAnonymous } = useSupabaseAuth();
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const accessToken = session?.access_token;

  useEffect(() => {
    if (!accessToken || isAnonymous) { setNotifications([]); setUnreadCount(0); return; }
    let isCurrent = true;
    const refresh = async () => {
      try {
        const next = await gameApiRepository.getNotifications(accessToken);
        if (isCurrent) { setNotifications(next.notifications); setUnreadCount(next.unreadCount); }
      } catch { /* A temporary notification failure should not affect play. */ }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { isCurrent = false; window.clearInterval(timer); };
  }, [accessToken, isAnonymous]);

  function markRead(notificationId: string): void {
    if (!accessToken) return;
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification || notification.isRead) return;
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, isRead: true } : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    void gameApiRepository.markNotificationRead(accessToken, notificationId).catch(() => {
      setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, isRead: false } : item));
      setUnreadCount((current) => current + 1);
    });
  }

  const value = useMemo(() => ({ notifications, unreadCount, markRead }), [notifications, unreadCount]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationsProvider.');
  return context;
}
