import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { getCapturedMaterial } from '../src/features/game/model/captured-material';

describe('getCapturedMaterial', () => {
  it('tracks captured pieces and the material advantage from move history', () => {
    const chess = new Chess();
    const moves = ['e4', 'd5', 'exd5', 'Qxd5'].map((notation, index) => {
      const move = chess.move(notation);
      return {
        id: String(index), ply: index + 1, playerId: 'player', from: move.from, to: move.to,
        san: move.san, color: move.color === 'w' ? 'white' as const : 'black' as const,
        fenAfter: chess.fen(), createdAt: new Date().toISOString(),
      };
    });

    expect(getCapturedMaterial({ startingFen: new Chess().fen(), moves })).toEqual({
      capturedByWhite: ['p'], capturedByBlack: ['p'], whiteAdvantage: 0,
    });
  });
});
