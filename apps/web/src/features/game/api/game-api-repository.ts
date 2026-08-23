import { apiRequest } from '@/shared/api/api-client';
import type { Game, PlaySession } from '@/features/game/model/game.types';

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
