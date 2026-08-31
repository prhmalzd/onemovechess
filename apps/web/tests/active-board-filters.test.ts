import { describe, expect, it } from 'vitest';
import { filterActiveBoards, getBoardRecency, type ActiveBoardFilters } from '../src/features/game/components/active-board-filters';
import type { Game } from '../src/features/game/model/game.types';

const now = new Date('2026-08-31T12:00:00.000Z');
const defaults: ActiveBoardFilters = { participation: 'all', moveBand: 'any', playerMoveDate: 'any', activityDate: 'any' };

function game(id: string, options: { moves?: number; playerMoveAt?: string; updatedAt?: string; status?: 'active' | 'completed' } = {}): Game {
  const moves = Array.from({ length: options.moves ?? 1 }, (_, index) => ({
    id: `${id}-${index}`, ply: index + 1, playerId: index === 0 && options.playerMoveAt ? 'me' : 'other', playerName: 'Player', from: 'e2', to: 'e4', san: 'e4', color: 'white' as const, fenAfter: '', createdAt: index === 0 && options.playerMoveAt ? options.playerMoveAt : '2026-08-29T12:00:00.000Z',
  }));
  return { id, creatorId: 'me', status: options.status ?? 'active', startingFen: '', currentFen: '', currentPly: moves.length, moveDistance: 10, version: 1, moves, participants: [], reservation: null, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: options.updatedAt ?? '2026-08-31T11:00:00.000Z' };
}

describe('active-board filters', () => {
  it('filters participation and move progress bands, then keeps newest activity first', () => {
    const newer = game('newer', { moves: 15, playerMoveAt: '2026-08-30T10:00:00.000Z', updatedAt: '2026-08-31T11:00:00.000Z' });
    const older = game('older', { moves: 18, playerMoveAt: '2026-08-30T09:00:00.000Z', updatedAt: '2026-08-30T11:00:00.000Z' });
    const other = game('other', { moves: 20 });
    expect(filterActiveBoards([older, other, newer], { ...defaults, participation: 'played', moveBand: '11-30' }, 'me', now).map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('applies both player-last-move and board-activity date dimensions', () => {
    const today = game('today', { playerMoveAt: '2026-08-31T08:00:00.000Z', updatedAt: '2026-08-31T09:00:00.000Z' });
    const playerOld = game('player-old', { playerMoveAt: '2026-08-15T08:00:00.000Z', updatedAt: '2026-08-31T09:00:00.000Z' });
    const boardOld = game('board-old', { playerMoveAt: '2026-08-31T08:00:00.000Z', updatedAt: '2026-08-15T09:00:00.000Z' });
    expect(filterActiveBoards([today, playerOld, boardOld], { ...defaults, playerMoveDate: 'today', activityDate: 'today' }, 'me', now).map((item) => item.id)).toEqual(['today']);
  });

  it('classifies recent, quiet, and completed cards', () => {
    expect(getBoardRecency(game('fresh', { updatedAt: '2026-08-31T11:30:00.000Z' }), now)).toBe('fresh');
    expect(getBoardRecency(game('today', { updatedAt: '2026-08-31T06:00:00.000Z' }), now)).toBe('today');
    expect(getBoardRecency(game('older', { updatedAt: '2026-08-28T06:00:00.000Z' }), now)).toBe('older');
    expect(getBoardRecency(game('done', { status: 'completed' }), now)).toBe('completed');
  });
});
