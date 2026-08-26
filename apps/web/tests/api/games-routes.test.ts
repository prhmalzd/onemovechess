import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../server/api';
import { GameError } from '../../server/games/games.service';

const mocks = vi.hoisted(() => ({
  requirePlayer: vi.fn(),
  claimPlayableGame: vi.fn(),
  submitMove: vi.fn(),
}));

vi.mock('../../server/auth/require-player', () => ({ requirePlayer: mocks.requirePlayer }));
vi.mock('../../server/games/games.service', () => ({
  GameError: class GameError extends Error { constructor(message: string, readonly statusCode: number) { super(message); } },
  gamesService: { claimPlayableGame: mocks.claimPlayableGame, submitMove: mocks.submitMove },
}));

import { POST as claimGame } from '../../app/api/v1/games/claim/route';
import { POST as submitMove } from '../../app/api/v1/games/[gameId]/moves/route';

describe('game route handlers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requirePlayer.mockResolvedValue('player-1');
  });

  it('returns a claimed game from the preserved claim endpoint', async () => {
    mocks.claimPlayableGame.mockResolvedValue({ id: 'game-1' });
    const response = await claimGame(new Request('http://test/api/v1/games/claim', { method: 'POST' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: 'game-1' });
    expect(mocks.claimPlayableGame).toHaveBeenCalledWith('player-1');
  });

  it('rejects an invalid move body before calling the game service', async () => {
    const response = await submitMove(new Request('http://test/api/v1/games/id/moves', {
      method: 'POST', body: JSON.stringify({ from: 'a9', to: 'e4', expectedVersion: 1 }),
    }), { params: Promise.resolve({ gameId: '77777777-7777-4777-8777-777777777777' }) });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: 'The request data is invalid.' });
    expect(mocks.submitMove).not.toHaveBeenCalled();
  });

  it('maps domain errors to the established response shape', async () => {
    mocks.claimPlayableGame.mockRejectedValue(new GameError('Board unavailable.', 409));
    const response = await claimGame(new Request('http://test/api/v1/games/claim', { method: 'POST' }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ message: 'Board unavailable.' });
  });
});
