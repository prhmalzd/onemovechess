import { describe, expect, it } from 'vitest';
import { findWatchedBoardAlerts } from '../src/features/game/providers/watched-board-alerts';
import type { Game } from '../src/features/game/model/game.types';

function game(ply: number, playerId = 'other'): Game {
  return { id: 'game-12345', creatorId: 'me', status: 'active', startingFen: '', currentFen: '', currentPly: ply, moveDistance: 10, version: ply, moves: ply ? [{ id: 'move', ply, playerId, playerName: 'Player', from: 'e2', to: 'e4', san: 'e4', color: 'white', fenAfter: '', createdAt: '2026-08-31T12:00:00.000Z' }] : [], participants: [], reservation: null, createdAt: '2026-08-31T12:00:00.000Z', updatedAt: '2026-08-31T12:00:00.000Z' };
}

describe('watched-board alerts', () => {
  it('is silent on the initial baseline', () => {
    const baseline = new Map<string, number>();
    baseline.set('game-12345', game(2).currentPly);
    expect(findWatchedBoardAlerts(baseline, [game(2)], 'me')).toEqual([]);
  });

  it('alerts when another player advances a watched board', () => {
    const baseline = new Map([['game-12345', 2]]);
    expect(findWatchedBoardAlerts(baseline, [game(3, 'other')], 'me')).toEqual([{ gameId: 'game-12345', boardLabel: 'Board 12345', moveLabel: '3. e4' }]);
  });

  it('suppresses an alert for the player’s own move while advancing the baseline', () => {
    const baseline = new Map([['game-12345', 2]]);
    expect(findWatchedBoardAlerts(baseline, [game(3, 'me')], 'me')).toEqual([]);
    expect(baseline.get('game-12345')).toBe(3);
  });
});
