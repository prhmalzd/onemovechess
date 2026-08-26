import { Chess, type Square } from 'chess.js';
import type { Game } from './game.types';

export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export const pieceValues: Record<PieceKind, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const pieceSymbols: Record<'white' | 'black', Record<PieceKind, string>> = {
  white: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  black: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

type CapturedMaterial = {
  capturedByWhite: PieceKind[];
  capturedByBlack: PieceKind[];
  whiteAdvantage: number;
};

function materialValue(pieces: PieceKind[]): number {
  return pieces.reduce((total, piece) => total + pieceValues[piece], 0);
}

export function getCapturedMaterial(game: Pick<Game, 'startingFen' | 'moves'>): CapturedMaterial {
  const capturedByWhite: PieceKind[] = [];
  const capturedByBlack: PieceKind[] = [];
  let positionBeforeMove = game.startingFen;

  for (const move of game.moves) {
    const chess = new Chess(positionBeforeMove);
    const movingPiece = chess.get(move.from as Square);
    let capturedPiece = chess.get(move.to as Square);

    // En passant captures a pawn beside the destination square rather than on it.
    if (!capturedPiece && movingPiece?.type === 'p' && move.from[0] !== move.to[0]) {
      capturedPiece = chess.get(`${move.to[0]}${move.from[1]}` as Square);
    }

    if (movingPiece && capturedPiece && movingPiece.color !== capturedPiece.color) {
      const captures = move.color === 'white' ? capturedByWhite : capturedByBlack;
      captures.push(capturedPiece.type as PieceKind);
    }

    positionBeforeMove = move.fenAfter;
  }

  return {
    capturedByWhite,
    capturedByBlack,
    whiteAdvantage: materialValue(capturedByWhite) - materialValue(capturedByBlack),
  };
}
