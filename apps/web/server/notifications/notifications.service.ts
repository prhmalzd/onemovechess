import { prisma } from '../database/prisma';
import { GameError } from '../games/games.service';

const notificationSelect = { id: true, gameId: true, moveId: true, title: true, body: true, isRead: true, createdAt: true } as const;

function serialize(notification: { id: string; gameId: string; moveId: string | null; title: string; body: string; isRead: boolean; createdAt: Date }) {
  return { ...notification, createdAt: notification.createdAt.toISOString() };
}

export const notificationsService = {
  async list(playerId: string, limit = 50) {
    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.playerNotification.findMany({ where: { playerId }, orderBy: { createdAt: 'desc' }, take: limit, select: notificationSelect }),
      prisma.playerNotification.count({ where: { playerId, isRead: false } }),
    ]);
    return { notifications: notifications.map(serialize), unreadCount };
  },

  async markRead(playerId: string, notificationId: string) {
    const updated = await prisma.playerNotification.updateMany({ where: { id: notificationId, playerId }, data: { isRead: true } });
    if (updated.count === 0) throw new GameError('This notification could not be found.', 404);
    return { id: notificationId, isRead: true };
  },
};
