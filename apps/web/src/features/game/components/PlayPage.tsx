import { useEffect, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs, type SquareRenderer } from 'react-chessboard';
import type { AvailableBoard, Game, PlaySession } from '@/features/game/model/game.types';
import { getCapturedMaterial, pieceSymbols } from '@/features/game/model/captured-material';
import { gameApiRepository } from '@/features/game/api/game-api-repository';
import { useSupabaseAuth } from '@/app/providers/SupabaseAuthProvider';
import { boardThemes, useAppPreferences } from '@/app/providers/AppPreferencesProvider';
import { AccountModal } from '@/shared/auth/AccountModal';
import { getPlayerProfile, profileColors, profilePieces } from '@/shared/auth/player-profile';
import { BoardPositionSquare, getBoardPositionState } from '@/features/game/components/board-position-state';

type AppPath = '/' | '/play' | '/active-boards' | '/how-to-play' | '/options';

function playerLabel(move: Game['moves'][number], currentPlayerId: string): string {
  return move.playerId === currentPlayerId ? 'You' : move.playerName;
}

function formatRemaining(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function AvailableBoardsSidebar({ boards, offset, nextOffset, isClaimingBoardId, isCreatingBoard, isLoading, isOpen, onClaim, onCreate, onRandom, onOffsetChange, onToggle, variant = 'sidebar' }: { boards: AvailableBoard[]; offset: number; nextOffset: number | null; isClaimingBoardId: string | null; isCreatingBoard: boolean; isLoading: boolean; isOpen: boolean; onClaim: (gameId: string) => void; onCreate: () => void; onRandom: () => void; onOffsetChange: (offset: number) => void; onToggle: () => void; variant?: 'sidebar' | 'chooser' }) {
  const { boardTheme, pieceStyle } = useAppPreferences();
  const theme = boardThemes[boardTheme];
  const className = variant === 'chooser' ? 'available-boards-sidebar available-boards-sidebar--chooser' : isOpen ? 'available-boards-sidebar' : 'available-boards-sidebar available-boards-sidebar--collapsed';
  const boardClassName = variant === 'chooser' ? 'available-board available-board--chooser' : 'available-board';
  return <aside aria-label="Available boards" className={className}>
    <button aria-expanded={isOpen} className="available-boards-sidebar__toggle" onClick={onToggle} type="button"><span>Available boards</span><i>{isOpen ? '→' : '←'}</i></button>
    {isOpen && <div className="available-boards-sidebar__content">{isLoading ? <p className="muted">Looking for boards…</p> : boards.length ? <><p className="available-boards-sidebar__intro">Choose a board, or let us pick one for you.</p><button className="random-board-button" disabled={isClaimingBoardId !== null || isCreatingBoard} onClick={onRandom} type="button">♞ Choose a random board</button><div className="available-boards__list">{boards.map((board, index) => <button className={boardClassName} disabled={isClaimingBoardId !== null || isCreatingBoard} key={board.id} onClick={() => onClaim(board.id)} type="button"><div className={`available-board__preview chessboard--locked ${pieceStyle === 'monochrome' ? 'piece-style--monochrome' : ''}`}><Chessboard options={{ id: `available-${board.id}`, position: board.currentFen, allowDragging: false, showNotation: false, darkSquareStyle: { backgroundColor: theme.dark }, lightSquareStyle: { backgroundColor: theme.light } }} /></div><span className="available-board__details"><span className="available-board__number">Board {String(offset + index + 1).padStart(2, '0')}</span><strong>{new Chess(board.currentFen).turn() === 'w' ? 'White to move' : 'Black to move'}</strong><small>Move {board.currentPly}</small></span>{isClaimingBoardId === board.id && <i>Joining…</i>}</button>)}</div><div className="available-boards__controls"><button disabled={offset === 0} onClick={() => onOffsetChange(Math.max(0, offset - 2))} type="button">← Earlier</button><button disabled={nextOffset === null} onClick={() => { if (nextOffset !== null) onOffsetChange(nextOffset); }} type="button">More boards →</button></div></> : <div className="available-boards-sidebar__empty"><p>No playable boards are available right now.</p><button className="create-board-button" disabled={isCreatingBoard} onClick={onCreate} type="button">{isCreatingBoard ? 'Creating board…' : 'Create new board'}</button></div>}</div>}
  </aside>;
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
  const [optimisticFen, setOptimisticFen] = useState<string | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [isSaveProgressOpen, setIsSaveProgressOpen] = useState(false);
  const [isBoardLimitOpen, setIsBoardLimitOpen] = useState(false);
  const [availableBoards, setAvailableBoards] = useState<AvailableBoard[]>([]);
  const [availableBoardsOffset, setAvailableBoardsOffset] = useState(0);
  const [nextAvailableBoardsOffset, setNextAvailableBoardsOffset] = useState<number | null>(null);
  const [availableBoardsRefresh, setAvailableBoardsRefresh] = useState(0);
  const [isLoadingAvailableBoards, setIsLoadingAvailableBoards] = useState(false);
  const [isClaimingBoardId, setIsClaimingBoardId] = useState<string | null>(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isAvailableBoardsOpen, setIsAvailableBoardsOpen] = useState(true);
  const [hasSubmittedMove, setHasSubmittedMove] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setIsLoadingAvailableBoards(true);
    void gameApiRepository.getAvailableBoards(accessToken, availableBoardsOffset)
      .then((page) => { setAvailableBoards(page.boards); setNextAvailableBoardsOffset(page.nextOffset); })
      .catch(() => { setAvailableBoards([]); setNextAvailableBoardsOffset(null); })
      .finally(() => setIsLoadingAvailableBoards(false));
  }, [accessToken, availableBoardsOffset, availableBoardsRefresh]);

  useEffect(() => {
    if (!playSession || !accessToken) return;
    const updateTimer = () => {
      const seconds = Math.max(0, Math.ceil((new Date(playSession.reservation.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) void gameApiRepository.getGame(accessToken, playSession.game.id).then(setGame).catch(() => setGame(null));
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [accessToken, playSession]);

  if (authStatus === 'loading' || !playerId || !accessToken) return <main className="page-shell"><p>Preparing your boards…</p></main>;
  const authenticatedToken = accessToken;

  function showClaimedBoard(claimedSession: PlaySession): void {
    setPlaySession(claimedSession);
    setGame(claimedSession.game);
    setBoardOrientation(new Chess(claimedSession.game.currentFen).turn() === 'b' ? 'black' : 'white');
    setRemainingSeconds(Math.max(0, Math.ceil((new Date(claimedSession.reservation.expiresAt).getTime() - Date.now()) / 1000)));
    setSelectedSquare(null);
    setOptimisticFen(null);
    setHasSubmittedMove(false);
    setAvailableBoardsOffset(0);
    setAvailableBoardsRefresh((revision) => revision + 1);
  }

  function handleClaimError(error: unknown): void {
    if (isAnonymous && error instanceof Error && error.message === 'Create an account to play another board. You can still view your active board.') setIsBoardLimitOpen(true);
    setAvailableBoardsRefresh((revision) => revision + 1);
  }

  function claimAvailableBoard(gameId: string): void {
    if (isClaimingBoardId || isCreatingBoard) return;
    setIsClaimingBoardId(gameId);
    void gameApiRepository.claimSpecificGame(authenticatedToken, gameId).then(showClaimedBoard).catch(handleClaimError).finally(() => setIsClaimingBoardId(null));
  }

  function createNewBoard(): void {
    if (isCreatingBoard || isClaimingBoardId) return;
    setIsCreatingBoard(true);
    void gameApiRepository.claimPlayableGame(authenticatedToken).then(showClaimedBoard).catch(handleClaimError).finally(() => setIsCreatingBoard(false));
  }

  function claimRandomBoard(): void {
    const board = availableBoards[Math.floor(Math.random() * availableBoards.length)];
    if (board) claimAvailableBoard(board.id);
  }

  const availableBoardsSidebar = <AvailableBoardsSidebar boards={availableBoards} isClaimingBoardId={isClaimingBoardId} isCreatingBoard={isCreatingBoard} isLoading={isLoadingAvailableBoards} isOpen={isAvailableBoardsOpen} nextOffset={nextAvailableBoardsOffset} offset={availableBoardsOffset} onClaim={claimAvailableBoard} onCreate={createNewBoard} onRandom={claimRandomBoard} onOffsetChange={setAvailableBoardsOffset} onToggle={() => setIsAvailableBoardsOpen((open) => !open)} />;
  const availableBoardsChooser = <AvailableBoardsSidebar boards={availableBoards} isClaimingBoardId={isClaimingBoardId} isCreatingBoard={isCreatingBoard} isLoading={isLoadingAvailableBoards} isOpen nextOffset={nextAvailableBoardsOffset} offset={availableBoardsOffset} onClaim={claimAvailableBoard} onCreate={createNewBoard} onRandom={claimRandomBoard} onOffsetChange={setAvailableBoardsOffset} onToggle={() => undefined} variant="chooser" />;

  if (!playSession || !game) return <main className="page-shell"><header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Community board</p><h1>Choose a board</h1></div></header><section className="board-panel--chooser"><p className="muted">Pick a playable board, or let Collective UnconsChess choose one for you.</p>{availableBoardsChooser}</section>{isBoardLimitOpen && <AccountModal allowSignIn onClose={() => onNavigate('/')} reason="board-limit" />}</main>;

  const visibleGame = game;
  const canMove = visibleGame.reservation?.playerId === playerId && remainingSeconds > 0 && visibleGame.status === 'active' && !isSubmittingMove;
  const chess = new Chess(visibleGame.currentFen);
  const lastMove = visibleGame.moves.at(-1);
  const capturedMaterial = getCapturedMaterial(visibleGame);
  const legalTargets = selectedSquare && canMove ? chess.moves({ square: selectedSquare, verbose: true }).map((move) => move.to) : [];
  const positionState = getBoardPositionState(optimisticFen ?? visibleGame.currentFen);
  const squareRenderer: SquareRenderer = ({ children, piece, square }) => <BoardPositionSquare overlay={legalTargets.includes(square as Square) ? <span aria-hidden="true" className={piece ? 'move-indicator move-indicator--capture' : 'move-indicator'} /> : undefined} square={square} state={positionState}>{children}</BoardPositionSquare>;

  function selectPiece(square: string): void {
    if (!canMove) return;
    const chessSquare = square as Square;
    if (chess.get(chessSquare)?.color === chess.turn()) setSelectedSquare(chessSquare);
  }

  async function submitMove(from: Square, to: Square): Promise<void> {
    const optimisticChess = new Chess(visibleGame.currentFen);
    if (!optimisticChess.move({ from, to, promotion: 'q' })) return;
    setIsSubmittingMove(true);
    setSelectedSquare(null);
    setOptimisticFen(optimisticChess.fen());
    try {
      const isFirstMoveByPlayer = !visibleGame.moves.some((move) => move.playerId === playerId);
      const updatedGame = await gameApiRepository.submitMove({ accessToken: authenticatedToken, gameId: visibleGame.id, from, to, expectedVersion: visibleGame.version });
      setGame(updatedGame);
      setHasSubmittedMove(true);
      setAvailableBoardsRefresh((revision) => revision + 1);
      if (isAnonymous && isFirstMoveByPlayer) setIsSaveProgressOpen(true);
    } finally {
      setOptimisticFen(null);
      setIsSubmittingMove(false);
    }
  }

  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!canMove || !targetSquare) return false;
    const source = sourceSquare as Square;
    const target = targetSquare as Square;
    if (!chess.moves({ square: source, verbose: true }).map((move) => move.to).includes(target)) return false;
    void submitMove(source, target);
    return false;
  }

  function onSquareClick({ square }: SquareHandlerArgs): void {
    if (!canMove) return;
    if (selectedSquare && legalTargets.includes(square as Square)) { void submitMove(selectedSquare, square as Square); return; }
    selectPiece(square);
  }

  function abortBoard(): void {
    void gameApiRepository.abortFirstMoveGame(authenticatedToken, visibleGame.id).then(() => onNavigate('/')).catch(() => undefined);
  }

  const boardOptions = { id: `game-${visibleGame.id}`, position: optimisticFen ?? visibleGame.currentFen, boardOrientation, onPieceDrop, onPieceClick: ({ square }: PieceHandlerArgs) => { if (square) selectPiece(square); }, onSquareClick, allowDragging: canMove, squareRenderer, squareStyles: { ...(lastMove ? { [lastMove.from]: { backgroundColor: 'rgba(242, 197, 79, .58)' }, [lastMove.to]: { backgroundColor: 'rgba(242, 197, 79, .72)' } } : {}), ...(selectedSquare ? { [selectedSquare]: { backgroundColor: 'rgba(72, 55, 39, .72)' } } : {}) }, boardStyle: { borderRadius: '2px' }, darkSquareStyle: { backgroundColor: theme.dark }, lightSquareStyle: { backgroundColor: theme.light } };

  return <main className="page-shell"><header className="page-header"><button className="back-link" onClick={() => onNavigate('/')} type="button">← Menu</button><div><p className="eyebrow">Community board</p><h1>Make one move</h1></div></header><div className={hasSubmittedMove ? 'play-workspace' : 'play-workspace play-workspace--board-only'}><section className="play-layout"><aside className="move-panel"><h2>Previous moves</h2>{visibleGame.moves.length === 0 ? <p className="muted">You are starting a new board.</p> : <ol className="move-list">{visibleGame.moves.map((move) => <li key={move.id}><span>{move.ply}. {move.san}</span><small>{playerLabel(move, playerId)}</small></li>)}</ol>}<section aria-label="Captured material" className="captured-material"><h2>Captured material</h2><div className="captured-row"><span>White</span><span aria-label={`Captured by White: ${capturedMaterial.capturedByWhite.length} pieces`} className="captured-pieces">{capturedMaterial.capturedByWhite.length ? capturedMaterial.capturedByWhite.map((piece, index) => <i key={`${piece}-${index}`}>{pieceSymbols.black[piece]}</i>) : '—'}</span></div><div className="captured-row"><span>Black</span><span aria-label={`Captured by Black: ${capturedMaterial.capturedByBlack.length} pieces`} className="captured-pieces">{capturedMaterial.capturedByBlack.length ? capturedMaterial.capturedByBlack.map((piece, index) => <i key={`${piece}-${index}`}>{pieceSymbols.white[piece]}</i>) : '—'}</span></div><p className="material-balance">{capturedMaterial.whiteAdvantage === 0 ? 'Material even' : `${capturedMaterial.whiteAdvantage > 0 ? 'White' : 'Black'} +${Math.abs(capturedMaterial.whiteAdvantage)}`}</p></section></aside><section className="board-panel"><div className="move-status"><strong>{canMove ? `Your move — ${formatRemaining(remainingSeconds)} remaining` : visibleGame.status === 'completed' ? 'This game is complete.' : 'Your move has been used. Choose another board from the sidebar when you are ready.'}</strong><p>{canMove ? 'Choose one legal move. Once saved, this board becomes read-only for you.' : 'The board remains live as other players contribute.'}</p></div><div className={`${!canMove ? 'chessboard--locked ' : ''}${pieceStyle === 'monochrome' ? 'piece-style--monochrome' : ''}`}><Chessboard options={boardOptions} /></div><div className="board-player-name board-player-name--play">{isAnonymous ? <i aria-hidden="true" className="board-player-name__guest">♞</i> : <i aria-hidden="true" style={{ backgroundColor: playerProfileColor.value }}>{playerProfilePiece.symbol}</i>}<span>{isAnonymous ? 'Guest' : playerProfile.displayName}</span></div>{canMove && visibleGame.moves.length === 0 && visibleGame.creatorId === playerId && <button className="abort-button" onClick={abortBoard} type="button">Abort this empty board</button>}</section></section>{hasSubmittedMove && availableBoardsSidebar}</div>{isSubmittingMove && <div aria-live="polite" className="move-saving-badge" role="status"><span aria-hidden="true" className="move-saving-spinner" />Saving move…</div>}{isSaveProgressOpen && isAnonymous && <AccountModal allowSignIn onClose={() => setIsSaveProgressOpen(false)} />}{isBoardLimitOpen && <AccountModal allowSignIn onClose={() => setIsBoardLimitOpen(false)} reason="board-limit" />}</main>;
}
