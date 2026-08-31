'use client';

import { useState } from 'react';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { OPEN_BOARD_KEY } from '@/features/game/providers/WatchedBoardsProvider';
import { useNotifications } from './NotificationsProvider';

export function NotificationBell() {
  const { isAnonymous, user } = useSupabaseAuth();
  const { notifications, unreadCount, markRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  if (isAnonymous || !user) return null;

  function openBoard(gameId: string): void {
    window.sessionStorage.setItem(OPEN_BOARD_KEY, gameId);
    window.location.assign('/active-boards');
  }

  return <div className="notification-bar" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}><button aria-expanded={isOpen} aria-haspopup="menu" aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'} className="notification-bell" onClick={() => setIsOpen((open) => !open)} type="button"><span aria-hidden="true">🔔</span>{unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}</button>{isOpen && <section className="notification-popover" onFocus={() => setIsOpen(true)} role="menu"><header><strong>Notifications</strong><button onClick={() => window.location.assign('/notifications')} type="button">More</button></header>{notifications.length === 0 ? <p>No notifications yet.</p> : <ol>{notifications.slice(0, 5).map((notification) => <li className={notification.isRead ? 'notification-item' : 'notification-item notification-item--unread'} key={notification.id} onMouseEnter={() => markRead(notification.id)}><button onClick={() => openBoard(notification.gameId)} onFocus={() => markRead(notification.id)} role="menuitem" type="button"><strong>{notification.title}</strong><span>{notification.body}</span></button></li>)}</ol>}</section>}</div>;
}
