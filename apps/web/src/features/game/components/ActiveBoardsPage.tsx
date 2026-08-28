import { useEffect, useState } from 'react';
import { Chessboard, type SquareRenderer } from 'react-chessboard';
import type { Game } from '@/features/game/model/game.types';
import { gameApiRepository } from '@/features/game/api/game-api-repository';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { boardThemes, useAppPreferences } from '@/app/providers/AppPreferencesProvider';
import { BoardPositionSquare, getBoardPositionState } from '@/features/game/components/board-position-state';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';

function BoardReview({ game, onBack, playerId }: { game: Game; onBack: () => void; playerId: string | undefined }) {
  const { boardTheme, pieceStyle } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(game.moves.length - 1);
  const selectedMove = selectedMoveIndex >= 0 ? game.moves[selectedMoveIndex] : null;
  const playerMoves = game.moves.filter((move) => move.playerId === playerId);
  const position = selectedMove?.fenAfter ?? game.startingFen;
  const positionState = getBoardPositionState(position);
  const squareRenderer: SquareRenderer = ({ children, square }) => <BoardPositionSquare square={square} state={positionState}>{children}</BoardPositionSquare>;

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={onBack} type="button">← Boards</button><div><p className="eyebrow">Move replay</p><h1>Board {game.id.slice(-5)}</h1></div></header>
    <section className="review-layout">
      <div className={`chessboard--locked ${pieceStyle === 'monochrome' ? 'piece-style--monochrome' : ''}`}><Chessboard options={{
        id: `review-${game.id}-${selectedMoveIndex}`,
        position,
        allowDragging: false,
        darkSquareStyle: { backgroundColor: theme.dark },
        lightSquareStyle: { backgroundColor: theme.light },
        squareRenderer,
        squareStyles: selectedMove ? {
          [selectedMove.from]: { backgroundColor: 'rgba(34, 29, 20, .5)' },
          [selectedMove.to]: { backgroundColor: 'rgba(34, 29, 20, .5)' },
        } : {},
      }} /></div>
      <aside className="review-moves"><h2>Moves</h2><p className="muted">Choose a move to view the board after it was played.</p><p className="player-move">{playerMoves.length ? `Your moves: ${playerMoves.map((move) => `${move.ply}. ${move.san}`).join(' · ')}` : 'You did not make a move on this board.'}</p><ol className="review-move-list">{game.moves.map((move, index) => <li key={move.id}><button aria-pressed={selectedMoveIndex === index} className={selectedMoveIndex === index ? 'review-move review-move--selected' : 'review-move'} onClick={() => setSelectedMoveIndex(index)} type="button"><span>{move.ply}. {move.san}</span><small>{move.playerId === playerId ? `You · ${move.color}` : move.color}</small></button></li>)}</ol></aside>
    </section>
  </main>;
}

export function ActiveBoardsPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const { session, status: authStatus } = useSupabaseAuth();
  const { boardTheme, pieceStyle } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const playerId = session?.user.id;
  const accessToken = session?.access_token;
  const [games, setGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState<'all' | 'played' | 'not-played'>('all');
  const [reviewGame, setReviewGame] = useState<Game | null>(null);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoadingBoards(authStatus === 'loading');
      return;
    }

    let isCurrent = true;
    const refresh = async (isInitialLoad = false) => {
      try {
        const nextGames = await gameApiRepository.getActiveBoards(accessToken);
        if (isCurrent) setGames(nextGames);
      } catch {
        if (isCurrent) setGames([]);
      } finally {
        if (isCurrent && isInitialLoad) setIsLoadingBoards(false);
      }
    };

    void refresh(true);
    const refreshTimer = window.setInterval(() => { void refresh(); }, 5000);
    return () => { isCurrent = false; window.clearInterval(refreshTimer); };
  }, [accessToken, authStatus]);

  const visibleGames = games.filter((game) => {
    const hasPlayed = game.moves.some((move) => move.playerId === playerId);
    return filter === 'all' || (filter === 'played' ? hasPlayed : !hasPlayed);
  });

  if (reviewGame) return <BoardReview game={reviewGame} onBack={() => setReviewGame(null)} playerId={playerId} />;

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Read-only</p><h1>Active boards</h1></div></header>
    <div className="board-filters" aria-label="Board filters">{(['all', 'played', 'not-played'] as const).map((item) => <button className={filter === item ? 'filter-button filter-button--active' : 'filter-button'} key={item} onClick={() => setFilter(item)} type="button">{item === 'all' ? 'All boards' : item === 'played' ? 'I played' : 'I did not play'}</button>)}</div>
    {isLoadingBoards ? <p className="empty-state">Loading active boards…</p> : visibleGames.length === 0 ? <p className="empty-state">{games.length === 0 ? 'There are no active boards yet.' : 'No boards match this filter.'}</p> : <section className="active-board-grid">{visibleGames.map((game) => {
      const playerMove = game.moves.find((move) => move.playerId === playerId);
      const moveColor = playerMove?.color ?? (playerMove && playerMove.ply % 2 === 1 ? 'white' : 'black');
      const positionState = getBoardPositionState(game.currentFen);
      const squareRenderer: SquareRenderer = ({ children, square }) => <BoardPositionSquare square={square} state={positionState}>{children}</BoardPositionSquare>;
      return <article className="active-board-card active-board-card--clickable" key={game.id} onClick={() => setReviewGame(game)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setReviewGame(game); }} role="button" tabIndex={0}><div><p className="card-meta">{game.status === 'active' ? 'In progress' : 'Complete'} · {game.moves.length} moves</p><h2>Board {game.id.slice(-5)}</h2><p className="player-move">{playerMove ? `Your move: ${playerMove.ply}. ${playerMove.san} (${moveColor})` : 'You did not make a move on this board.'}</p></div><div className={`active-board-preview chessboard--locked ${pieceStyle === 'monochrome' ? 'piece-style--monochrome' : ''}`}><Chessboard options={{ id: `preview-${game.id}`, position: game.currentFen, allowDragging: false, showNotation: false, darkSquareStyle: { backgroundColor: theme.dark }, lightSquareStyle: { backgroundColor: theme.light }, squareRenderer }} /></div></article>;
    })}</section>}
  </main>;
}
