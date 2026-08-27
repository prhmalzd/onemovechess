import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
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
  '2d': { label: 'Profile', action: 'profile' },
  '4d': { label: 'Active boards', action: 'active-boards' },
};

const isSameSquare = (first: Square, second: Square) => first.column === second.column && first.row === second.row;

function getSquareFromKey(key: string): Square | null {
  const column = Number(key[0]);
  const row = key[1] as Row | undefined;
  return COLUMNS.includes(column) && row && ROWS.includes(row) ? { column, row } : null;
}

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
  const [isDraggingKnight, setIsDraggingKnight] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressNextClick = useRef(false);
  const legalMoves = useMemo(() => selectedSquare ? getLegalMoves(selectedSquare) : [], [selectedSquare]);

  useEffect(() => { setGuest(getAnonymousPlayer()); }, []);

  function completeKnightMove(square: Square): void {
    if (!getLegalMoves(knight).some((move) => isSameSquare(move, square))) return;
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
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    if (isSameSquare(knight, square)) {
      setSelectedSquare((current) => current ? null : knight);
      return;
    }

    if (!selectedSquare) return;
    completeKnightMove(square);
  }

  function startKnightDrag(event: PointerEvent<HTMLSpanElement>): void {
    if (event.button !== 0) return;
    dragState.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedSquare(knight);
  }

  function moveKnightDrag(event: PointerEvent<HTMLSpanElement>): void {
    const currentDrag = dragState.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY) > 8) {
      currentDrag.moved = true;
    }
    if (currentDrag.moved) {
      setIsDraggingKnight(true);
      setDragPosition({ x: event.clientX, y: event.clientY });
    }
  }

  function endKnightDrag(event: PointerEvent<HTMLSpanElement>): void {
    const currentDrag = dragState.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
    dragState.current = null;
    setIsDraggingKnight(false);
    setDragPosition(null);
    if (!currentDrag.moved) return;
    suppressNextClick.current = true;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('[data-menu-square]');
    const targetSquare = target?.dataset.menuSquare ? getSquareFromKey(target.dataset.menuSquare) : null;
    if (targetSquare) completeKnightMove(targetSquare);
  }

  function cancelKnightDrag(): void {
    dragState.current = null;
    setIsDraggingKnight(false);
    setDragPosition(null);
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
              const destinationLabel = destination?.action === 'profile' && (isAnonymous || !user) ? 'Sign in' : destination?.label;
              const isKnight = isSameSquare(knight, square); const isLegal = legalMoves.some((move) => isSameSquare(move, square)); const isSelected = selectedSquare ? isSameSquare(selectedSquare, square) : false; const isLight = (column + rowIndex) % 2 === 0;
              return <button aria-label={destinationLabel ? `${destinationLabel}, ${key}` : `Square ${key}`} className={`board-square ${isLight ? 'board-square--light' : 'board-square--dark'} ${isLegal ? 'board-square--legal' : ''} ${isSelected ? 'board-square--selected' : ''} ${destination ? 'board-square--destination' : ''}`} data-menu-square={key} key={key} onClick={() => moveKnight(square)} role="gridcell" style={{ backgroundColor: isLight ? theme.light : theme.dark }} type="button">
                {destinationLabel && <span className="destination-label">{destinationLabel}</span>}
                {isKnight && <span aria-label="Knight" className={isDraggingKnight ? 'knight knight--dragging' : 'knight'} onPointerCancel={cancelKnightDrag} onPointerDown={startKnightDrag} onPointerMove={moveKnightDrag} onPointerUp={endKnightDrag}>{'\u265E'}</span>}
              </button>;
            }))}
          </div>
        </div>
      </div>
      {isDraggingKnight && dragPosition && <span aria-hidden="true" className="knight-drag-preview" style={{ left: dragPosition.x, top: dragPosition.y }}>{'\u265E'}</span>}
      <div className="board-player-name">{isAnonymous || !user ? <i aria-hidden="true" className="board-player-name__guest">♞</i> : <i aria-hidden="true" style={{ backgroundColor: profileColor.value }}>{profilePiece.symbol}</i>}<span>{isAnonymous || !user ? guest?.displayName ?? 'Guest' : profile.displayName}</span></div>
    </section>
    {isSignInOpen && (isAnonymous || !user) && <AccountModal allowSignIn onClose={() => setIsSignInOpen(false)} />}
  </main>;
}
