import { useEffect, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs, type SquareRenderer } from 'react-chessboard';
import type { Game, PlaySession } from '@/features/game/model/game.types';
import { getCapturedMaterial, pieceSymbols } from '@/features/game/model/captured-material';
import { gameApiRepository } from '@/features/game/api/game-api-repository';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { boardThemes, useAppPreferences } from '@/app/providers/AppPreferencesProvider';
import { AccountModal } from '@/shared/auth/AccountModal';
import { getPlayerProfile, profileColors, profilePieces } from '@/shared/auth/player-profile';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';

function playerLabel(move: Game['moves'][number], currentPlayerId: string): string {
  return move.playerId === currentPlayerId ? 'You' : move.playerName;
}

function formatRemaining(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function PlayPage({ onNavigate }: { onNavigate: (path: AppPath) => void }) {
  const { session: authSession, status: authStatus, isAnonymous, user } = useSupabaseAuth();
  const { boardTheme, pieceStyle } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const playerId = authSession?.user.id;
  const accessToken = authSession?.access_token;
  const playerProfile = getPlayerProfile(user);
  const playerProfilePiece = profilePieces.find((piece) => piece.id === playerProfile.piece) ?? profilePieces[1];
  const playerProfileColor = profileColors.find((color) => color.id === playerProfile.color) ?? profileColors[0];
  const [playSession, setPlaySession] = useState<PlaySession | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [isClaimingNextBoard, setIsClaimingNextBoard] = useState(false);
  const [hasSubmittedMove, setHasSubmittedMove] = useState(false);
  const [optimisticFen, setOptimisticFen] = useState<string | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [isSaveProgressOpen, setIsSaveProgressOpen] = useState(false);
  const [isBoardLimitOpen, setIsBoardLimitOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    void gameApiRepository.claimPlayableGame(accessToken)
      .then((claimedSession) => {
        setPlaySession(claimedSession);
        setGame(claimedSession.game);
        setBoardOrientation(new Chess(claimedSession.game.currentFen).turn() === 'b' ? 'black' : 'white');
      })
      .catch((error: unknown) => {
        if (isAnonymous && error instanceof Error && error.message === 'Create an account to play another board. You can still view your active board.') {
          setIsBoardLimitOpen(true);
          return;
        }
        setGame(null);
      });
  }, [accessToken, isAnonymous]);

  async function claimNextBoard(): Promise<void> {
    if (!accessToken || isClaimingNextBoard) return;

    setIsClaimingNextBoard(true);
    try {
      const claimedSession = await gameApiRepository.claimPlayableGame(accessToken);
      setPlaySession(claimedSession);
      setGame(claimedSession.game);
      setBoardOrientation(new Chess(claimedSession.game.currentFen).turn() === 'b' ? 'black' : 'white');
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(claimedSession.reservation.expiresAt).getTime() - Date.now()) / 1000)));
      setSelectedSquare(null);
      setOptimisticFen(null);
      setHasSubmittedMove(false);
    } catch (error: unknown) {
      if (isAnonymous && error instanceof Error && error.message === 'Create an account to play another board. You can still view your active board.') {
        setIsBoardLimitOpen(true);
      }
    } finally {
      setIsClaimingNextBoard(false);
    }
  }

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
    return <main className="page-shell"><p>{isBoardLimitOpen ? 'Your guest account already has a board.' : 'Preparing your board…'}</p>{isBoardLimitOpen && <AccountModal allowSignIn onClose={() => onNavigate('/')} reason="board-limit" />}</main>;
  }

  const authenticatedToken = accessToken;
  const visibleGame = game;
  const canMove = visibleGame.reservation?.playerId === playerId && remainingSeconds > 0 && visibleGame.status === 'active' && !isSubmittingMove;
  const chess = new Chess(visibleGame.currentFen);
  const lastMove = visibleGame.moves.at(-1);
  const capturedMaterial = getCapturedMaterial(visibleGame);
  const legalTargets = selectedSquare && canMove
    ? chess.moves({ square: selectedSquare, verbose: true }).map((move) => move.to)
    : [];
  const squareRenderer: SquareRenderer = ({ children, piece, square }) => <div style={{ height: '100%', position: 'relative', width: '100%' }}>
    {children}
    {legalTargets.includes(square as Square) && <span aria-hidden="true" className={piece ? 'move-indicator move-indicator--capture' : 'move-indicator'} />}
  </div>;

  function selectPiece(square: string): void {
    if (!canMove) return;
    const chessSquare = square as Square;
    const piece = chess.get(chessSquare);
    if (piece?.color === chess.turn()) setSelectedSquare(chessSquare);
  }

  async function submitMove(from: Square, to: Square): Promise<void> {
    const optimisticChess = new Chess(visibleGame.currentFen);
    const optimisticMove = optimisticChess.move({ from, to, promotion: 'q' });
    if (!optimisticMove) return;

    setIsSubmittingMove(true);
    setSelectedSquare(null);
    setOptimisticFen(optimisticChess.fen());
    try {
      const isFirstMoveByPlayer = !visibleGame.moves.some((move) => move.playerId === playerId);
      const updatedGame = await gameApiRepository.submitMove({
        accessToken: authenticatedToken,
        gameId: visibleGame.id,
        from,
        to,
        expectedVersion: visibleGame.version,
      });
      setGame(updatedGame);
      setHasSubmittedMove(true);
      if (isAnonymous && isFirstMoveByPlayer) setIsSaveProgressOpen(true);
    } catch {
      // Invalid/stale moves quietly return to the last confirmed board position.
    } finally {
      setOptimisticFen(null);
      setIsSubmittingMove(false);
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!canMove || !targetSquare) return false;
    const source = sourceSquare as Square;
    const target = targetSquare as Square;
    const sourceMoves = chess.moves({ square: source, verbose: true }).map((move) => move.to);
    if (!sourceMoves.includes(target)) return false;
    void submitMove(source, target);
    return false;
  }

  function onSquareClick({ square }: SquareHandlerArgs): void {
    if (!canMove) return;
    if (selectedSquare && legalTargets.includes(square as Square)) {
      void submitMove(selectedSquare, square as Square);
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
    position: optimisticFen ?? visibleGame.currentFen,
    boardOrientation,
    onPieceDrop,
    onPieceClick: ({ square }: PieceHandlerArgs) => { if (square) selectPiece(square); },
    onSquareClick,
    allowDragging: canMove,
    squareRenderer,
    squareStyles: {
      ...(lastMove ? {
        [lastMove.from]: { backgroundColor: 'rgba(242, 197, 79, .58)' },
        [lastMove.to]: { backgroundColor: 'rgba(242, 197, 79, .72)' },
      } : {}),
      ...(selectedSquare ? { [selectedSquare]: { backgroundColor: 'rgba(72, 55, 39, .72)' } } : {}),
    },
    boardStyle: { borderRadius: '2px' },
    darkSquareStyle: { backgroundColor: theme.dark },
    lightSquareStyle: { backgroundColor: theme.light },
  };

  return <main className="page-shell">
    <header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Community board</p><h1>Make one move</h1></div></header>
    <section className="play-layout">
      <aside className="move-panel"><h2>Previous moves</h2>{visibleGame.moves.length === 0 ? <p className="muted">You are starting a new board.</p> : <ol className="move-list">{visibleGame.moves.map((move) => <li key={move.id}><span>{move.ply}. {move.san}</span><small>{playerLabel(move, playerId)}</small></li>)}</ol>}<section aria-label="Captured material" className="captured-material"><h2>Captured material</h2><div className="captured-row"><span>White</span><span aria-label={`Captured by White: ${capturedMaterial.capturedByWhite.length} pieces`} className="captured-pieces">{capturedMaterial.capturedByWhite.length ? capturedMaterial.capturedByWhite.map((piece, index) => <i key={`${piece}-${index}`}>{pieceSymbols.black[piece]}</i>) : '—'}</span></div><div className="captured-row"><span>Black</span><span aria-label={`Captured by Black: ${capturedMaterial.capturedByBlack.length} pieces`} className="captured-pieces">{capturedMaterial.capturedByBlack.length ? capturedMaterial.capturedByBlack.map((piece, index) => <i key={`${piece}-${index}`}>{pieceSymbols.white[piece]}</i>) : '—'}</span></div><p className="material-balance">{capturedMaterial.whiteAdvantage === 0 ? 'Material even' : `${capturedMaterial.whiteAdvantage > 0 ? 'White' : 'Black'} +${Math.abs(capturedMaterial.whiteAdvantage)}`}</p></section></aside>
      <section className="board-panel">
        <div className="move-status"><strong>{canMove ? `Your move — ${formatRemaining(remainingSeconds)} remaining` : visibleGame.status === 'completed' ? 'This game is complete.' : 'Your move has been used. You can stay and watch this board.'}</strong><p>{canMove ? 'Choose one legal move. Once saved, this board becomes read-only for you.' : 'The board remains live as other players contribute.'}</p></div>
        <div className={`${!canMove ? 'chessboard--locked ' : ''}${pieceStyle === 'monochrome' ? 'piece-style--monochrome' : ''}`}><Chessboard options={boardOptions} /></div>
        <div className="board-player-name board-player-name--play">{isAnonymous ? <i aria-hidden="true" className="board-player-name__guest">♞</i> : <i aria-hidden="true" style={{ backgroundColor: playerProfileColor.value }}>{playerProfilePiece.symbol}</i>}<span>{isAnonymous ? 'Guest' : playerProfile.displayName}</span></div>
        {canMove && visibleGame.moves.length === 0 && visibleGame.creatorId === playerId && <button className="abort-button" onClick={abortBoard} type="button">Abort this empty board</button>}
        {hasSubmittedMove && <button className="next-board-button" disabled={isClaimingNextBoard} onClick={() => { void claimNextBoard(); }} type="button">{isClaimingNextBoard ? 'Finding next board…' : 'Next board →'}</button>}
      </section>
    </section>
    {isSubmittingMove && <div aria-live="polite" className="move-saving-badge" role="status"><span aria-hidden="true" className="move-saving-spinner" />Saving move…</div>}
    {isSaveProgressOpen && isAnonymous && <AccountModal allowSignIn onClose={() => setIsSaveProgressOpen(false)} />}
    {isBoardLimitOpen && <AccountModal allowSignIn onClose={() => setIsBoardLimitOpen(false)} reason="board-limit" />}
  </main>;
}
