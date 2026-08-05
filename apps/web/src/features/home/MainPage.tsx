import { useMemo, useState } from 'react';

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
  const [knight, setKnight] = useState<Square>({ column: 3, row: 'c' });
  const [message, setMessage] = useState('Choose a legal knight move.');
  const legalMoves = useMemo(() => getLegalMoves(knight), [knight]);

  function moveKnight(square: Square) {
    if (!legalMoves.some((move) => isSameSquare(move, square))) {
      setMessage('That is not a legal knight move.');
      return;
    }
    setKnight(square);
    const destination = DESTINATIONS[`${square.column}${square.row}`];
    if (!destination) {
      setMessage(`Knight moved to ${square.column}${square.row}. Choose another legal move.`);
      return;
    }
    if (destination.action === 'play') onNavigate('/play');
    else if (destination.action === 'exit') setMessage('This tab can be closed when you are ready.');
    else setMessage(destination.action === 'how-to-play'
      ? 'Move the knight onto a destination. A knight moves two squares in one direction and one square perpendicular.'
      : 'Options will be available here soon.');
  }

  return <main className="main-page">
    <header className="site-header"><p className="eyebrow">A community-made game</p><h1>One Move Chess</h1></header>
    <section aria-label="Main menu" className="menu-section">
      <p aria-live="polite" className="instruction">{message}</p>
      <div className="board-shell">
        <div aria-hidden="true" className="column-labels">{COLUMNS.map((column) => <span key={column}>{column}</span>)}</div>
        <div className="board-and-rows">
          <div className="row-labels" aria-hidden="true">{ROWS.map((row) => <span key={row}>{row}</span>)}</div>
          <div className="menu-board" role="grid" aria-label="Knight move menu">
            {ROWS.map((row, rowIndex) => COLUMNS.map((column) => {
              const square = { column, row }; const key = `${column}${row}`; const destination = DESTINATIONS[key];
              const isKnight = isSameSquare(knight, square); const isLegal = legalMoves.some((move) => isSameSquare(move, square));
              return <button aria-label={destination ? `${destination.label}, ${key}` : `Square ${key}`} className={`board-square ${((column + rowIndex) % 2 === 0) ? 'board-square--light' : 'board-square--dark'} ${isLegal ? 'board-square--legal' : ''} ${destination ? 'board-square--destination' : ''}`} key={key} onClick={() => moveKnight(square)} role="gridcell" type="button">
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
