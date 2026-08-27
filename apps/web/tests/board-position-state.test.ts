import { describe, expect, it } from 'vitest';
import { getBoardPositionState } from '../src/features/game/components/board-position-state';

describe('board position state', () => {
  it('marks the checked king', () => {
    expect(getBoardPositionState('4k3/8/8/8/8/8/8/4R1K1 b - - 0 1')).toMatchObject({ checkedKing: 'e8', losingKing: null, drawKings: [] });
  });

  it('marks the winner and rotated losing king on checkmate', () => {
    expect(getBoardPositionState('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')).toMatchObject({ checkedKing: 'h8', losingKing: 'h8', winnerKing: 'g6', drawKings: [] });
  });

  it('marks both kings for stalemate', () => {
    expect(getBoardPositionState('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toMatchObject({ checkedKing: null, drawKings: ['g6', 'h8'] });
  });
});
