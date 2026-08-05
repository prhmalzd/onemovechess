import { useEffect, useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Game } from '@/features/game/model/game.types';
import { localGameRepository } from '@/features/game/services/local-game-repository';
import { getCurrentPlayerId } from '@/features/game/services/player-identity';

type AppPath = '/' | '/play' | '/active-boards';

export function ActiveBoardsPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const playerId = useMemo(getCurrentPlayerId, []);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const refresh = () => setGames(localGameRepository.getActiveBoards(playerId));
    refresh();
    window.addEventListener('storage', refresh);
    const refreshTimer = window.setInterval(refresh, 5000);
    return () => { window.removeEventListener('storage', refresh); window.clearInterval(refreshTimer); };
  }, [playerId]);

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Read-only</p><h1>Active boards</h1></div></header>
    {games.length === 0 ? <p className="empty-state">You have not joined a board yet.</p> : <section className="active-board-grid">{games.map((game) => <article className="active-board-card" key={game.id}><div><p className="card-meta">{game.status === 'active' ? 'In progress' : 'Complete'} · {game.moves.length} moves</p><h2>Board {game.id.slice(-5)}</h2></div><Chessboard options={{ id: `preview-${game.id}`, position: game.currentFen, allowDragging: false, showNotation: false, darkSquareStyle: { backgroundColor: '#806849' }, lightSquareStyle: { backgroundColor: '#e6d4ae' } }} /></article>)}</section>}
  </main>;
}
