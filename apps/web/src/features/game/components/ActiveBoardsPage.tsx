import { useEffect, useState } from 'react';
import { Chessboard, type SquareRenderer } from 'react-chessboard';
import type { Game } from '@/features/game/model/game.types';
import { gameApiRepository } from '@/features/game/api/game-api-repository';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { boardThemes, useAppPreferences } from '@/app/providers/AppPreferencesProvider';
import { BoardPositionSquare, getBoardPositionState } from '@/features/game/components/board-position-state';
import { AccountModal } from '@/shared/auth/AccountModal';
import { OPEN_BOARD_KEY } from '@/features/game/providers/WatchedBoardsProvider';
import { filterActiveBoards, getBoardRecency, getPlayerLastMove, type ActiveBoardFilters, type DateFilter, type MoveBandFilter, type ParticipationFilter } from './active-board-filters';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';

function BoardReview({ game, onBack, playerId }: { game: Game; onBack: () => void; playerId: string | undefined }) {
  const { boardTheme, pieceStyle } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const [selectedMoveIndex, setSelectedMoveIndex] = useState(game.moves.length - 1);
  const selectedMove = selectedMoveIndex >= 0 ? game.moves[selectedMoveIndex] : null;
  const playerMoves = game.moves.filter((move) => move.playerId === playerId);
  const position = selectedMove?.fenAfter ?? game.startingFen;
  const positionState = getBoardPositionState(position);
  const squareRenderer: SquareRenderer = ({ children, square }) => {
    const isLastMoveSquare = selectedMove && (square === selectedMove.from || square === selectedMove.to);
    return <BoardPositionSquare overlay={isLastMoveSquare ? <span aria-label={square === selectedMove.to ? 'Last move destination' : 'Last move origin'} className={square === selectedMove.to ? 'last-move-highlight last-move-highlight--destination' : 'last-move-highlight'} /> : undefined} square={square} state={positionState}>{children}</BoardPositionSquare>;
  };

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
      }} /></div>
      <aside className="review-moves"><h2>Moves</h2><p className="muted">Choose a move to view the board after it was played.</p><p className="player-move">{playerMoves.length ? `Your moves: ${playerMoves.map((move) => `${move.ply}. ${move.san}`).join(' · ')}` : 'You did not make a move on this board.'}</p><ol className="review-move-list">{game.moves.map((move, index) => <li key={move.id}><button aria-pressed={selectedMoveIndex === index} className={selectedMoveIndex === index ? 'review-move review-move--selected' : 'review-move'} onClick={() => setSelectedMoveIndex(index)} type="button"><span>{move.ply}. {move.san}</span><small>{move.playerId === playerId ? `You · ${move.color}` : move.color}</small></button></li>)}</ol></aside>
    </section>
  </main>;
}

export function ActiveBoardsPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const { session, status: authStatus, isAnonymous } = useSupabaseAuth();
  const { boardTheme, pieceStyle } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const playerId = session?.user.id;
  const accessToken = session?.access_token;
  const [games, setGames] = useState<Game[]>([]);
  const [filters, setFilters] = useState<ActiveBoardFilters>({ participation: 'all', moveBand: 'any', playerMoveDate: 'any', activityDate: 'any' });
  const [reviewGame, setReviewGame] = useState<Game | null>(null);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [pendingWatchGameId, setPendingWatchGameId] = useState<string | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSavingWatch, setIsSavingWatch] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setIsLoadingBoards(authStatus === 'loading');
      return;
    }

    let isCurrent = true;
    const refresh = async (isInitialLoad = false) => {
      try {
        const nextGames = await gameApiRepository.getActiveBoards(accessToken);
        if (!isCurrent) return;
        setGames(nextGames);
        const requestedGameId = window.sessionStorage.getItem(OPEN_BOARD_KEY);
        const requestedGame = requestedGameId ? nextGames.find((game) => game.id === requestedGameId) : undefined;
        if (requestedGame) {
          window.sessionStorage.removeItem(OPEN_BOARD_KEY);
          setReviewGame(requestedGame);
        }
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

  useEffect(() => {
    if (!pendingWatchGameId || !accessToken || isAnonymous) return;
    let isCurrent = true;
    setIsSavingWatch(pendingWatchGameId);
    void gameApiRepository.setBoardWatch(accessToken, pendingWatchGameId, true)
      .then(() => { if (isCurrent) setGames((current) => current.map((game) => game.id === pendingWatchGameId ? { ...game, isWatched: true } : game)); })
      .finally(() => { if (isCurrent) { setIsSavingWatch(null); setPendingWatchGameId(null); } });
    return () => { isCurrent = false; };
  }, [accessToken, isAnonymous, pendingWatchGameId]);

  const visibleGames = filterActiveBoards(games, filters, playerId);

  function updateFilter<Key extends keyof ActiveBoardFilters>(key: Key, value: ActiveBoardFilters[Key]): void {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleWatch(game: Game): void {
    if (isAnonymous || !accessToken) {
      setPendingWatchGameId(game.id);
      setIsAccountModalOpen(true);
      return;
    }
    const nextIsWatched = !game.isWatched;
    setIsSavingWatch(game.id);
    void gameApiRepository.setBoardWatch(accessToken, game.id, nextIsWatched)
      .then(() => setGames((current) => current.map((item) => item.id === game.id ? { ...item, isWatched: nextIsWatched } : item)))
      .finally(() => setIsSavingWatch(null));
  }

  if (reviewGame) return <BoardReview game={reviewGame} onBack={() => setReviewGame(null)} playerId={playerId} />;

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Read-only</p><h1>Active boards</h1></div></header>
    <section className="board-filter-panel" aria-label="Board filters"><div className="board-filters">{(['all', 'played', 'not-played'] as const).map((item) => <button className={filters.participation === item ? 'filter-button filter-button--active' : 'filter-button'} key={item} onClick={() => updateFilter('participation', item as ParticipationFilter)} type="button">{item === 'all' ? 'All boards' : item === 'played' ? 'I played' : 'I did not play'}</button>)}</div><div className="board-filter-selects"><label>Move number<select onChange={(event) => updateFilter('moveBand', event.target.value as MoveBandFilter)} value={filters.moveBand}><option value="any">Any</option><option value="1-10">1–10</option><option value="11-30">11–30</option><option value="31-60">31–60</option><option value="61+">61+</option></select></label><label>Your last move<select onChange={(event) => updateFilter('playerMoveDate', event.target.value as DateFilter)} value={filters.playerMoveDate}><option value="any">Any date</option><option value="today">Today</option><option value="7-days">Last 7 days</option><option value="30-days">Last 30 days</option></select></label><label>Board activity<select onChange={(event) => updateFilter('activityDate', event.target.value as DateFilter)} value={filters.activityDate}><option value="any">Any date</option><option value="today">Today</option><option value="7-days">Last 7 days</option><option value="30-days">Last 30 days</option></select></label></div><p className="filter-summary">Newest board activity first.</p></section>
    {isLoadingBoards ? <p className="empty-state">Loading active boards…</p> : visibleGames.length === 0 ? <p className="empty-state">{games.length === 0 ? 'There are no active boards yet.' : 'No boards match this filter.'}</p> : <section className="active-board-grid">{visibleGames.map((game) => {
      const playerMove = getPlayerLastMove(game, playerId);
      const moveColor = playerMove?.color ?? (playerMove && playerMove.ply % 2 === 1 ? 'white' : 'black');
      const positionState = getBoardPositionState(game.currentFen);
      const squareRenderer: SquareRenderer = ({ children, square }) => <BoardPositionSquare square={square} state={positionState}>{children}</BoardPositionSquare>;
      const recency = getBoardRecency(game);
      return <article className={`active-board-card active-board-card--${recency} active-board-card--clickable ${game.isWatched ? 'active-board-card--watched' : ''}`} key={game.id} onClick={() => setReviewGame(game)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') setReviewGame(game); }} role="button" tabIndex={0}><div className="active-board-card__header"><div><p className="card-meta">{game.status === 'active' ? 'In progress' : 'Complete'} · {game.moves.length} moves</p><h2>Board {game.id.slice(-5)}</h2><p className="player-move">{playerMove ? `Your last move: ${playerMove.ply}. ${playerMove.san} (${moveColor})` : 'You did not make a move on this board.'}</p></div><button aria-pressed={Boolean(game.isWatched)} className={game.isWatched ? 'watch-toggle watch-toggle--active' : 'watch-toggle'} disabled={isSavingWatch === game.id} onClick={(event) => { event.stopPropagation(); toggleWatch(game); }} type="button">{isSavingWatch === game.id ? 'Saving…' : game.isWatched ? '★ Watching' : '☆ Watch'}</button></div><div className={`active-board-preview chessboard--locked ${pieceStyle === 'monochrome' ? 'piece-style--monochrome' : ''}`}><Chessboard options={{ id: `preview-${game.id}`, position: game.currentFen, allowDragging: false, showNotation: false, darkSquareStyle: { backgroundColor: theme.dark }, lightSquareStyle: { backgroundColor: theme.light }, squareRenderer }} /></div></article>;
    })}</section>}
    {isAccountModalOpen && <AccountModal allowSignIn onAuthenticated={() => setIsAccountModalOpen(false)} onClose={() => { setIsAccountModalOpen(false); if (isAnonymous) setPendingWatchGameId(null); }} />}
  </main>;
}
