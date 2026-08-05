import { useEffect, useMemo, useState } from 'react';
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard';
import type { Game, PlaySession } from '@/features/game/model/game.types';
import { localGameRepository } from '@/features/game/services/local-game-repository';
import { getCurrentPlayerId } from '@/features/game/services/player-identity';

type AppPath = '/' | '/play' | '/active-boards';

function playerLabel(playerId: string, currentPlayerId: string): string {
  return playerId === currentPlayerId ? 'You' : `Player ${playerId.slice(-4)}`;
}

function formatRemaining(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PlayPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const playerId = useMemo(getCurrentPlayerId, []);
  const [session, setSession] = useState<PlaySession | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const claimedSession = localGameRepository.claimPlayableGame(playerId);
    setSession(claimedSession);
    setGame(claimedSession.game);
  }, [playerId]);

  useEffect(() => {
    if (!session) return;
    const updateTimer = () => {
      const seconds = Math.max(0, Math.ceil((new Date(session.reservation.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) setGame(localGameRepository.getGame(session.game.id));
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  if (!session || !game) return <main className="page-shell"><p>Preparing your board…</p></main>;

  const visibleGame = game;
  const canMove = visibleGame.reservation?.playerId === playerId && remainingSeconds > 0 && visibleGame.status === 'active';

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!canMove || !targetSquare) return false;
    try {
      const updatedGame = localGameRepository.submitMove(visibleGame.id, playerId, sourceSquare, targetSquare);
      setGame(updatedGame);
      setError(null);
      return true;
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'The move could not be saved.');
      return false;
    }
  }

  const boardOptions = {
    id: `game-${visibleGame.id}`,
    position: visibleGame.currentFen,
    onPieceDrop,
    allowDragging: canMove,
    boardStyle: { borderRadius: '2px' },
    darkSquareStyle: { backgroundColor: '#806849' },
    lightSquareStyle: { backgroundColor: '#e6d4ae' },
  };

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Community board</p><h1>Make one move</h1></div></header>
    <section className="play-layout">
      <aside className="move-panel"><h2>Previous moves</h2>{visibleGame.moves.length === 0 ? <p className="muted">You are starting a new board.</p> : <ol className="move-list">{visibleGame.moves.map((move) => <li key={move.id}><span>{move.ply}. {move.san}</span><small>{playerLabel(move.playerId, playerId)}</small></li>)}</ol>}</aside>
      <section className="board-panel">
        <div className="move-status"><strong>{canMove ? `Your move — ${formatRemaining(remainingSeconds)} remaining` : visibleGame.status === 'completed' ? 'This game is complete.' : 'Your move has been used. You can stay and watch this board.'}</strong><p>{canMove ? 'Choose one legal move. Once saved, this board becomes read-only for you.' : 'The board remains live as other players contribute.'}</p></div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <Chessboard options={boardOptions} />
      </section>
    </section>
  </main>;
}
