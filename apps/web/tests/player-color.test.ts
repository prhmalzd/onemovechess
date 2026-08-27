import { describe, expect, it } from 'vitest';
import { boardTurnColor, canPlayAssignedColor } from '../server/games/player-color';

describe('player board color', () => {
  const whiteTurnFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const blackTurnFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';

  it('derives the permanent first-move color from the board turn', () => {
    expect(boardTurnColor(whiteTurnFen)).toBe('white');
    expect(boardTurnColor(blackTurnFen)).toBe('black');
  });

  it('allows an unassigned participant to make a first move', () => {
    expect(canPlayAssignedColor(null, whiteTurnFen)).toBe(true);
  });

  it('only allows a returning participant on their assigned color turn', () => {
    expect(canPlayAssignedColor('white', whiteTurnFen)).toBe(true);
    expect(canPlayAssignedColor('white', blackTurnFen)).toBe(false);
    expect(canPlayAssignedColor('black', blackTurnFen)).toBe(true);
  });
});
