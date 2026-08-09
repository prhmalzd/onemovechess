import { useMemo, useState } from 'react';
import { getAnonymousPlayer } from '@/features/game/services/player-identity';

type Row = 'a' | 'b' | 'c' | 'd' | 'e';
type Square = { column: number; row: Row };
type AppPath = '/' | '/play' | '/active-boards';
type Destination = 'play' | 'how-to-play' | 'options' | 'exit';

const ROWS: Row[] = ['a', 'b', 'c', 'd', 'e'];
const COLUMNS = [1, 2, 3, 4, 5];
const DESTINATIONS: Record<string, { label: string; action: Destination }> = {
  '2a': { label: 'Play', action: 'play' },
  '4a': { label: 'How to play', action: 'how-to-play' },
  '2e': { label: 'Options', action: 'options' },
  '4e': { label: 'Exit', action: 'exit' },
};

const isSameSquare = (first: Square, second: Square) => first.column === second.column && first.row === second.row;

function getLegalMoves(square: Square): Square[] {
  const currentRow = ROWS.indexOf(square.row);
  const offsets: ReadonlyArray<readonly [number, number]> = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  return offsets.flatMap(([columnOffset, rowOffset]) => {
    const row = ROWS[currentRow + rowOffset];
    const column = square.column + columnOffset;
    return row && column >= 1 && column <= 5 ? [{ column, row }] : [];
  });
}

export function MainPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const guest = useMemo(getAnonymousPlayer, []);
  const [knight, setKnight] = useState<Square>({ column: 3, row: 'c' });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const legalMoves = useMemo(() => selectedSquare ? getLegalMoves(selectedSquare) : [], [selectedSquare]);

  function moveKnight(square: Square) {
    if (isSameSquare(knight, square)) {
      setSelectedSquare((current) => current ? null : knight);
      return;
    }

    if (!selectedSquare || !legalMoves.some((move) => isSameSquare(move, square))) return;
    setKnight(square);
    setSelectedSquare(null);
    const destination = DESTINATIONS[`${square.column}${square.row}`];
    if (!destination) {
      return;
    }
    if (destination.action === 'play') onNavigate('/play');
  }

  return <main className="main-page">
    <div className="account-area">
      <span className="guest-label">Playing as {guest.displayName}</span>
      <button aria-label="Sign in or sign up, coming soon" className="account-button" disabled type="button">Sign in</button>
    </div>
    <header className="site-header"><p className="eyebrow">A community-made game</p><h1>One Move Chess</h1></header>
    <section aria-label="Main menu" className="menu-section">
      <p className="instruction">Select the knight, then choose a highlighted square.</p>
      <div className="board-shell">
        <div aria-hidden="true" className="column-labels">{COLUMNS.map((column) => <span key={column}>{column}</span>)}</div>
        <div className="board-and-rows">
          <div className="row-labels" aria-hidden="true">{ROWS.map((row) => <span key={row}>{row}</span>)}</div>
          <div className="menu-board" role="grid" aria-label="Knight move menu">
            {ROWS.map((row, rowIndex) => COLUMNS.map((column) => {
              const square = { column, row }; const key = `${column}${row}`; const destination = DESTINATIONS[key];
              const isKnight = isSameSquare(knight, square); const isLegal = legalMoves.some((move) => isSameSquare(move, square)); const isSelected = selectedSquare ? isSameSquare(selectedSquare, square) : false;
              return <button aria-label={destination ? `${destination.label}, ${key}` : `Square ${key}`} className={`board-square ${((column + rowIndex) % 2 === 0) ? 'board-square--light' : 'board-square--dark'} ${isLegal ? 'board-square--legal' : ''} ${isSelected ? 'board-square--selected' : ''} ${destination ? 'board-square--destination' : ''}`} key={key} onClick={() => moveKnight(square)} role="gridcell" type="button">
                {destination && <span className="destination-label">{destination.label}</span>}
                {isKnight && <span aria-label="Knight" className="knight">{'\u265E'}</span>}
              </button>;
            }))}
          </div>
        </div>
      </div>
      <button className="secondary-action" onClick={() => onNavigate('/active-boards')} type="button">Active boards</button>
    </section>
  </main>;
}
