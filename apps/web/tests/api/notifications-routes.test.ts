import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameError } from '../../server/games/games.service';

const mocks = vi.hoisted(() => ({ requireRegisteredPlayer: vi.fn(), list: vi.fn(), markRead: vi.fn() }));

vi.mock('../../server/auth/require-player', () => ({ requireRegisteredPlayer: mocks.requireRegisteredPlayer }));
vi.mock('../../server/notifications/notifications.service', () => ({ notificationsService: { list: mocks.list, markRead: mocks.markRead } }));

import { GET } from '../../app/api/v1/notifications/route';
import { PATCH } from '../../app/api/v1/notifications/[notificationId]/read/route';

const params = { params: Promise.resolve({ notificationId: '77777777-7777-4777-8777-777777777777' }) };

describe('notification route handlers', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.requireRegisteredPlayer.mockResolvedValue('player-1'); });

  it('lists persisted notifications with unread count', async () => {
    mocks.list.mockResolvedValue({ notifications: [{ id: 'notification-1', isRead: false }], unreadCount: 1 });
    const response = await GET(new Request('http://test/api/v1/notifications'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ notifications: [{ id: 'notification-1', isRead: false }], unreadCount: 1 });
    expect(mocks.list).toHaveBeenCalledWith('player-1');
  });

  it('marks only the signed-in player’s notification as read', async () => {
    mocks.markRead.mockResolvedValue({ id: 'notification-1', isRead: true });
    const response = await PATCH(new Request('http://test/api/v1/notifications/id/read', { method: 'PATCH' }), params);
    expect(response.status).toBe(200);
    expect(mocks.markRead).toHaveBeenCalledWith('player-1', '77777777-7777-4777-8777-777777777777');
  });

  it('maps missing or inaccessible notifications to the established error shape', async () => {
    mocks.markRead.mockRejectedValue(new GameError('This notification could not be found.', 404));
    const response = await PATCH(new Request('http://test/api/v1/notifications/id/read', { method: 'PATCH' }), params);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ message: 'This notification could not be found.' });
  });
});
