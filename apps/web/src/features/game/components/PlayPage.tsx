import { useEffect, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs } from 'react-chessboard';
import type { Game, PlaySession } from '@/features/game/model/game.types';
import { gameApiRepository } from '@/features/game/api/game-api-repository';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';

type AppPath = '/' | '/play' | '/active-boards';

function playerLabel(playerId: string, currentPlayerId: string): string {
  return playerId === currentPlayerId ? 'You' : `Player ${playerId.slice(-4)}`;
}

function formatRemaining(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PlayPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const { session: authSession, status: authStatus } = useSupabaseAuth();
  const playerId = authSession?.user.id;
  const accessToken = authSession?.access_token;
  const [playSession, setPlaySession] = useState<PlaySession | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    void gameApiRepository.claimPlayableGame(accessToken)
      .then((claimedSession) => {
        setPlaySession(claimedSession);
        setGame(claimedSession.game);
      })
      .catch(() => setGame(null));
  }, [accessToken]);

  useEffect(() => {
    if (!playSession) return;
    const updateTimer = () => {
      const seconds = Math.max(0, Math.ceil((new Date(playSession.reservation.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0 && accessToken) {
        void gameApiRepository.getGame(accessToken, playSession.game.id).then(setGame).catch(() => setGame(null));
      }
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [accessToken, playSession]);

  if (authStatus === 'loading' || !playerId || !accessToken || !playSession || !game) {
    return <main className="page-shell"><p>Preparing your board…</p></main>;
  }

  const authenticatedToken = accessToken;
  const visibleGame = game;
  const canMove = visibleGame.reservation?.playerId === playerId && remainingSeconds > 0 && visibleGame.status === 'active';
  const chess = new Chess(visibleGame.currentFen);
  const legalTargets = selectedSquare && canMove
    ? chess.moves({ square: selectedSquare, verbose: true }).map((move) => move.to)
    : [];

  function selectPiece(square: string): void {
    if (!canMove) return;
    const chessSquare = square as Square;
    const piece = chess.get(chessSquare);
    if (piece?.color === chess.turn()) setSelectedSquare(chessSquare);
  }

  async function submitSelectedMove(targetSquare: Square): Promise<void> {
    if (!selectedSquare || !legalTargets.includes(targetSquare)) return;
    try {
      const updatedGame = await gameApiRepository.submitMove({
        accessToken: authenticatedToken,
        gameId: visibleGame.id,
        from: selectedSquare,
        to: targetSquare,
        expectedVersion: visibleGame.version,
      });
      setGame(updatedGame);
      setSelectedSquare(null);
    } catch {
      // Invalid/stale moves intentionally leave the board unchanged and quiet.
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!canMove || !targetSquare) return false;
    const source = sourceSquare as Square;
    const target = targetSquare as Square;
    const sourceMoves = chess.moves({ square: source, verbose: true }).map((move) => move.to);
    if (!sourceMoves.includes(target)) return false;
    setSelectedSquare(source);
    void submitSelectedMove(target);
    return false;
  }

  function onSquareClick({ square }: SquareHandlerArgs): void {
    if (!canMove) return;
    if (selectedSquare && legalTargets.includes(square as Square)) {
      void submitSelectedMove(square as Square);
      return;
    }
    selectPiece(square);
  }

  function abortBoard(): void {
    void gameApiRepository.abortFirstMoveGame(authenticatedToken, visibleGame.id)
      .then(() => onNavigate('/'))
      .catch(() => undefined);
  }

  const boardOptions = {
    id: `game-${visibleGame.id}`,
    position: visibleGame.currentFen,
    onPieceDrop,
    onPieceClick: ({ square }: PieceHandlerArgs) => { if (square) selectPiece(square); },
    onSquareClick,
    allowDragging: canMove,
    squareStyles: {
      ...(selectedSquare ? { [selectedSquare]: { backgroundColor: 'rgba(72, 55, 39, .72)' } } : {}),
      ...Object.fromEntries(legalTargets.map((square) => [square, { backgroundImage: 'radial-gradient(circle, rgba(24, 21, 17, .52) 0 16%, transparent 18%)' }])),
    },
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
        <Chessboard options={boardOptions} />
        {canMove && visibleGame.moves.length === 0 && visibleGame.creatorId === playerId && <button className="abort-button" onClick={abortBoard} type="button">Abort this empty board</button>}
      </section>
    </section>
  </main>;
}
