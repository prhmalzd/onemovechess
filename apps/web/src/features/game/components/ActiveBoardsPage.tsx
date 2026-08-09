import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Game } from '@/features/game/model/game.types';
import { localGameRepository } from '@/features/game/services/local-game-repository';
import { getCurrentPlayerId } from '@/features/game/services/player-identity';

type AppPath = '/' | '/play' | '/active-boards';

export function ActiveBoardsPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const playerId = useMemo(getCurrentPlayerId, []);
  const [games, setGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState<'all' | 'played' | 'not-played'>('all');

  useEffect(() => {
    const refresh = () => setGames(localGameRepository.getActiveBoards(playerId));
    refresh();
    window.addEventListener('storage', refresh);
    const refreshTimer = window.setInterval(refresh, 5000);
    return () => { window.removeEventListener('storage', refresh); window.clearInterval(refreshTimer); };
  }, [playerId]);

  const visibleGames = games.filter((game) => {
    const hasPlayed = game.moves.some((move) => move.playerId === playerId);
    return filter === 'all' || (filter === 'played' ? hasPlayed : !hasPlayed);
  });

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Read-only</p><h1>Active boards</h1></div></header>
    <div className="board-filters" aria-label="Board filters">{(['all', 'played', 'not-played'] as const).map((item) => <button className={filter === item ? 'filter-button filter-button--active' : 'filter-button'} key={item} onClick={() => setFilter(item)} type="button">{item === 'all' ? 'All boards' : item === 'played' ? 'I played' : 'I did not play'}</button>)}</div>
    {visibleGames.length === 0 ? <p className="empty-state">No boards match this filter.</p> : <section className="active-board-grid">{visibleGames.map((game) => {
      const playerMove = game.moves.find((move) => move.playerId === playerId);
      const moveColor = playerMove?.color ?? (playerMove && playerMove.ply % 2 === 1 ? 'white' : 'black');
      return <article className="active-board-card" key={game.id}><div><p className="card-meta">{game.status === 'active' ? 'In progress' : 'Complete'} · {game.moves.length} moves</p><h2>Board {game.id.slice(-5)}</h2><p className="player-move">{playerMove ? `Your move: ${playerMove.ply}. ${playerMove.san} (${moveColor})` : 'You did not make a move on this board.'}</p></div><Chessboard options={{ id: `preview-${game.id}`, position: game.currentFen, allowDragging: false, showNotation: false, darkSquareStyle: { backgroundColor: '#806849' }, lightSquareStyle: { backgroundColor: '#e6d4ae' } }} /></article>;
    })}</section>}
  </main>;
}
