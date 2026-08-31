import { apiRequest } from '@/shared/api/api-client';
import type { AvailableBoardsPage, Game, NotificationsPage, PlaySession } from '@/features/game/model/game.types';

export const gameApiRepository = {
  async claimPlayableGame(accessToken: string): Promise<PlaySession> {
    const game = await apiRequest<Game>('/v1/games/claim', accessToken, { method: 'POST' });
    if (!game.reservation) throw new Error('The server did not return a move reservation.');
    return { game, reservation: game.reservation };
  },

  getGame(accessToken: string, gameId: string): Promise<Game> {
    return apiRequest<Game>(`/v1/games/${gameId}`, accessToken);
  },

  getActiveBoards(accessToken: string): Promise<Game[]> {
    return apiRequest<Game[]>('/v1/games/active-boards', accessToken);
  },

  getWatchedBoards(accessToken: string): Promise<Game[]> {
    return apiRequest<Game[]>('/v1/games/watched', accessToken);
  },

  setBoardWatch(accessToken: string, gameId: string, isWatched: boolean): Promise<{ gameId: string; isWatched: boolean }> {
    return apiRequest<{ gameId: string; isWatched: boolean }>(`/v1/games/${gameId}/watch`, accessToken, { method: isWatched ? 'PUT' : 'DELETE' });
  },

  getNotifications(accessToken: string): Promise<NotificationsPage> {
    return apiRequest<NotificationsPage>('/v1/notifications', accessToken);
  },

  markNotificationRead(accessToken: string, notificationId: string): Promise<{ id: string; isRead: boolean }> {
    return apiRequest<{ id: string; isRead: boolean }>(`/v1/notifications/${notificationId}/read`, accessToken, { method: 'PATCH' });
  },

  getAvailableBoards(accessToken: string, offset = 0): Promise<AvailableBoardsPage> {
    return apiRequest<AvailableBoardsPage>(`/v1/games/available?offset=${offset}`, accessToken);
  },

  claimSpecificGame(accessToken: string, gameId: string): Promise<PlaySession> {
    return apiRequest<Game>(`/v1/games/${gameId}/claim`, accessToken, { method: 'POST' })
      .then((game) => {
        if (!game.reservation) throw new Error('The server did not return a move reservation.');
        return { game, reservation: game.reservation };
      });
  },

  submitMove(input: { accessToken: string; gameId: string; from: string; to: string; promotion?: string; expectedVersion: number }): Promise<Game> {
    const { accessToken, gameId, ...body } = input;
    return apiRequest<Game>(`/v1/games/${gameId}/moves`, accessToken, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  abortFirstMoveGame(accessToken: string, gameId: string): Promise<void> {
    return apiRequest<void>(`/v1/games/${gameId}/abort`, accessToken, { method: 'POST' });
  },
};
