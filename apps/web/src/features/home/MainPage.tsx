import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { getAnonymousPlayer, type AnonymousPlayer } from '@/features/game/services/player-identity';
import { boardThemes, useAppPreferences } from '@/app/providers/AppPreferencesProvider';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { getPlayerProfile, profileColors, profilePieces } from '@/shared/auth/player-profile';
import { AccountModal } from '@/shared/auth/AccountModal';

type Row = 'a' | 'b' | 'c' | 'd' | 'e';
type Square = { column: number; row: Row };
type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';
type Destination = 'play' | 'how-to-play' | 'profile' | 'active-boards';

const ROWS: Row[] = ['a', 'b', 'c', 'd', 'e'];
const COLUMNS = [1, 2, 3, 4, 5];
const DESTINATIONS: Record<string, { label: string; action: Destination }> = {
  '2a': { label: 'Play', action: 'play' },
  '4a': { label: 'How to play', action: 'how-to-play' },
  '3e': { label: 'Profile', action: 'profile' },
  '4e': { label: 'Active boards', action: 'active-boards' },
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
  const [guest, setGuest] = useState<AnonymousPlayer | null>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const { user, isAnonymous } = useSupabaseAuth();
  const { boardTheme } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const profile = getPlayerProfile(user);
  const profilePiece = profilePieces.find((piece) => piece.id === profile.piece) ?? profilePieces[1];
  const profileColor = profileColors.find((color) => color.id === profile.color) ?? profileColors[0];
  const [knight, setKnight] = useState<Square>({ column: 3, row: 'c' });
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const legalMoves = useMemo(() => selectedSquare ? getLegalMoves(selectedSquare) : [], [selectedSquare]);

  useEffect(() => { setGuest(getAnonymousPlayer()); }, []);

  function completeKnightMove(square: Square): void {
    if (!legalMoves.some((move) => isSameSquare(move, square))) return;
    setKnight(square);
    setSelectedSquare(null);
    const destination = DESTINATIONS[`${square.column}${square.row}`];
    if (!destination) return;
    if (destination.action === 'play') onNavigate('/play');
    if (destination.action === 'how-to-play') onNavigate('/how-to-play');
    if (destination.action === 'profile') {
      if (isAnonymous || !user) setIsSignInOpen(true);
      else onNavigate('/options');
    }
    if (destination.action === 'active-boards') onNavigate('/active-boards');
  }

  function moveKnight(square: Square) {
    if (isSameSquare(knight, square)) {
      setSelectedSquare((current) => current ? null : knight);
      return;
    }

    if (!selectedSquare) return;
    completeKnightMove(square);
  }

  function startKnightDrag(event: DragEvent<HTMLSpanElement>): void {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', 'knight');
    setSelectedSquare(knight);
  }

  function allowKnightDrop(event: DragEvent<HTMLButtonElement>, square: Square): void {
    if (legalMoves.some((move) => isSameSquare(move, square))) event.preventDefault();
  }

  function dropKnight(event: DragEvent<HTMLButtonElement>, square: Square): void {
    event.preventDefault();
    completeKnightMove(square);
  }

  return <main className="main-page">
    <header className="site-header"><p className="eyebrow">A community-made game</p><h1>One Move Chess</h1></header>
    <section aria-label="Main menu" className="menu-section">
      <p className="instruction">Select or drag the knight, then choose a highlighted square.</p>
      <div className="board-shell">
        <div aria-hidden="true" className="column-labels">{COLUMNS.map((column) => <span key={column}>{column}</span>)}</div>
        <div className="board-and-rows">
          <div className="row-labels" aria-hidden="true">{ROWS.map((row) => <span key={row}>{row}</span>)}</div>
          <div className="menu-board" role="grid" aria-label="Knight move menu">
            {ROWS.map((row, rowIndex) => COLUMNS.map((column) => {
              const square = { column, row }; const key = `${column}${row}`; const destination = DESTINATIONS[key];
              const isKnight = isSameSquare(knight, square); const isLegal = legalMoves.some((move) => isSameSquare(move, square)); const isSelected = selectedSquare ? isSameSquare(selectedSquare, square) : false; const isLight = (column + rowIndex) % 2 === 0;
              return <button aria-label={destination ? `${destination.label}, ${key}` : `Square ${key}`} className={`board-square ${isLight ? 'board-square--light' : 'board-square--dark'} ${isLegal ? 'board-square--legal' : ''} ${isSelected ? 'board-square--selected' : ''} ${destination ? 'board-square--destination' : ''}`} key={key} onClick={() => moveKnight(square)} onDragOver={(event) => allowKnightDrop(event, square)} onDrop={(event) => dropKnight(event, square)} role="gridcell" style={{ backgroundColor: isLight ? theme.light : theme.dark }} type="button">
                {destination && <span className="destination-label">{destination.label}</span>}
                {isKnight && <span aria-label="Knight" className="knight" draggable onDragStart={startKnightDrag}>{'\u265E'}</span>}
              </button>;
            }))}
          </div>
        </div>
      </div>
      <div className="board-player-name">{isAnonymous || !user ? <i aria-hidden="true" className="board-player-name__guest">♞</i> : <i aria-hidden="true" style={{ backgroundColor: profileColor.value }}>{profilePiece.symbol}</i>}<span>{isAnonymous || !user ? guest?.displayName ?? 'Guest' : profile.displayName}</span></div>
    </section>
    {isSignInOpen && (isAnonymous || !user) && <AccountModal allowSignIn onClose={() => setIsSignInOpen(false)} />}
  </main>;
}
