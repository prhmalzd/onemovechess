'use client';

import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { OPEN_BOARD_KEY } from '@/features/game/providers/WatchedBoardsProvider';
import { useNotifications } from './NotificationsProvider';

export function NotificationsPage() {
  const { isAnonymous, user } = useSupabaseAuth();
  const { notifications, markRead } = useNotifications();
  function openBoard(gameId: string, notificationId: string): void {
    markRead(notificationId);
    window.sessionStorage.setItem(OPEN_BOARD_KEY, gameId);
    window.location.assign('/active-boards');
  }
  if (isAnonymous || !user) return <main className="page-shell"><header className="page-header"><a className="back-link" href="/">← Menu</a><div><p className="eyebrow">Account</p><h1>Notifications</h1></div></header><p className="empty-state">Create an account to receive board updates.</p></main>;
  return <main className="page-shell"><header className="page-header"><a className="back-link" href="/">← Menu</a><div><p className="eyebrow">Board updates</p><h1>Notifications</h1></div></header>{notifications.length === 0 ? <p className="empty-state">No notifications yet. Watch a board to receive updates when other players move.</p> : <ol className="notifications-list">{notifications.map((notification) => <li className={notification.isRead ? 'notification-page-item' : 'notification-page-item notification-page-item--unread'} key={notification.id} onMouseEnter={() => markRead(notification.id)}><button onClick={() => openBoard(notification.gameId, notification.id)} onFocus={() => markRead(notification.id)} type="button"><span>{new Date(notification.createdAt).toLocaleString()}</span><strong>{notification.title}</strong><p>{notification.body}</p></button></li>)}</ol>}</main>;
}
