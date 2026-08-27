import type { ReactNode } from 'react';
import { Chess } from 'chess.js';

type Color = 'w' | 'b';

export type BoardPositionState = {
  checkedKing: string | null;
  losingKing: string | null;
  winnerKing: string | null;
  drawKings: string[];
};

function kingSquare(chess: Chess, color: Color): string | null {
  const files = 'abcdefgh';
  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const piece = chess.board()[rankIndex]?.[fileIndex];
      if (piece?.type === 'k' && piece.color === color) return `${files[fileIndex]}${8 - rankIndex}`;
    }
  }
  return null;
}

export function getBoardPositionState(fen: string): BoardPositionState {
  const chess = new Chess(fen);
  const whiteKing = kingSquare(chess, 'w');
  const blackKing = kingSquare(chess, 'b');
  const checkedKing = chess.isCheck() ? kingSquare(chess, chess.turn()) : null;
  if (chess.isCheckmate()) {
    const losingColor = chess.turn();
    return { checkedKing, losingKing: kingSquare(chess, losingColor), winnerKing: kingSquare(chess, losingColor === 'w' ? 'b' : 'w'), drawKings: [] };
  }
  if (chess.isDraw()) return { checkedKing, losingKing: null, winnerKing: null, drawKings: [whiteKing, blackKing].filter((square): square is string => square !== null) };
  return { checkedKing, losingKing: null, winnerKing: null, drawKings: [] };
}

export function BoardPositionSquare({ children, square, state, overlay }: { children: ReactNode; square: string; state: BoardPositionState; overlay?: ReactNode }) {
  const isLosingKing = square === state.losingKing;
  return <div className={`position-square ${square === state.checkedKing ? 'position-square--checked' : ''}`}><span className={isLosingKing ? 'position-square__piece position-square__piece--losing' : 'position-square__piece'}>{children}</span>{square === state.winnerKing && <i aria-label="Winner" className="position-marker position-marker--winner">♛</i>}{state.drawKings.includes(square) && <i aria-label="Draw" className="position-marker position-marker--draw">½</i>}{overlay}</div>;
}
