import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameError } from '../../server/games/games.service';

const mocks = vi.hoisted(() => ({ requireRegisteredPlayer: vi.fn(), getWatchedBoards: vi.fn(), setBoardWatch: vi.fn() }));

vi.mock('../../server/auth/require-player', () => ({ requireRegisteredPlayer: mocks.requireRegisteredPlayer }));
vi.mock('../../server/games/games.service', () => ({
  GameError: class GameError extends Error { constructor(message: string, readonly statusCode: number) { super(message); } },
  gamesService: { getWatchedBoards: mocks.getWatchedBoards, setBoardWatch: mocks.setBoardWatch },
}));

import { GET as watchedBoards } from '../../app/api/v1/games/watched/route';
import { DELETE, PUT } from '../../app/api/v1/games/[gameId]/watch/route';

const params = { params: Promise.resolve({ gameId: '77777777-7777-4777-8777-777777777777' }) };

describe('board watch route handlers', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.requireRegisteredPlayer.mockResolvedValue('player-1'); });

  it('lists a signed-in player’s watched board state', async () => {
    mocks.getWatchedBoards.mockResolvedValue([{ id: 'game-1', isWatched: true }]);
    const response = await watchedBoards(new Request('http://test/api/v1/games/watched'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ id: 'game-1', isWatched: true }]);
    expect(mocks.getWatchedBoards).toHaveBeenCalledWith('player-1');
  });

  it('rejects an anonymous or missing authenticated player before reading watches', async () => {
    mocks.requireRegisteredPlayer.mockRejectedValue(new GameError('Create an account to watch boards.', 403));
    const response = await watchedBoards(new Request('http://test/api/v1/games/watched'));
    expect(response.status).toBe(403);
    expect(mocks.getWatchedBoards).not.toHaveBeenCalled();
  });

  it('persists and removes a participant watch', async () => {
    mocks.setBoardWatch.mockResolvedValue({ gameId: 'game-1', isWatched: true });
    const enabled = await PUT(new Request('http://test/api/v1/games/id/watch', { method: 'PUT' }), params);
    expect(enabled.status).toBe(200);
    expect(mocks.setBoardWatch).toHaveBeenCalledWith('player-1', '77777777-7777-4777-8777-777777777777', true);
    mocks.setBoardWatch.mockResolvedValue({ gameId: 'game-1', isWatched: false });
    const disabled = await DELETE(new Request('http://test/api/v1/games/id/watch', { method: 'DELETE' }), params);
    expect(disabled.status).toBe(200);
    expect(mocks.setBoardWatch).toHaveBeenLastCalledWith('player-1', '77777777-7777-4777-8777-777777777777', false);
  });

  it('maps a non-participant watch request to the established error response', async () => {
    mocks.setBoardWatch.mockRejectedValue(new GameError('You can only watch boards you have joined.', 403));
    const response = await PUT(new Request('http://test/api/v1/games/id/watch', { method: 'PUT' }), params);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: 'You can only watch boards you have joined.' });
  });
});
