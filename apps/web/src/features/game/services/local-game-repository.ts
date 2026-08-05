import { Chess } from 'chess.js';
import type { Game, GameParticipant, MoveRecord, PlaySession, PlayerId } from '@/features/game/model/game.types';

const GAMES_KEY = 'one-move-chess.games';
const RESERVATION_DURATION_MS = 5 * 60 * 1000;

function now(): string {
  return new Date().toISOString();
}

function readGames(): Game[] {
  const storedGames = window.localStorage.getItem(GAMES_KEY);
  if (!storedGames) return [];

  try {
    return JSON.parse(storedGames) as Game[];
  } catch {
    return [];
  }
}

function writeGames(games: Game[]): void {
  window.localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

function isReservationActive(game: Game, currentTime = Date.now()): boolean {
  return game.reservation !== null && new Date(game.reservation.expiresAt).getTime() > currentTime;
}

function participantFor(game: Game, playerId: PlayerId): GameParticipant | undefined {
  return game.participants.find((participant) => participant.playerId === playerId);
}

function canPlayerMove(game: Game, playerId: PlayerId): boolean {
  const participant = participantFor(game, playerId);
  if (participant?.status === 'timed_out') return false;
  if (participant?.lastMovePly === null || participant === undefined) return true;
  return game.moves.length - participant.lastMovePly >= game.moveDistance;
}

function expireReservations(games: Game[]): Game[] {
  const currentTime = Date.now();

  return games.map((game) => {
    if (!game.reservation || isReservationActive(game, currentTime)) return game;

    return {
      ...game,
      reservation: null,
      participants: game.participants.map((participant) =>
        participant.playerId === game.reservation?.playerId
          ? { ...participant, status: 'timed_out', timedOutAt: now() }
          : participant,
      ),
      updatedAt: now(),
    };
  });
}

function createGame(playerId: PlayerId): Game {
  const chess = new Chess();
  const createdAt = now();

  return {
    id: crypto.randomUUID(),
    creatorId: playerId,
    status: 'active',
    startingFen: chess.fen(),
    currentFen: chess.fen(),
    moveDistance: 10,
    moves: [],
    participants: [{
      playerId,
      status: 'active',
      lastMovePly: null,
      joinedAt: createdAt,
      timedOutAt: null,
    }],
    reservation: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function reserve(game: Game, playerId: PlayerId): PlaySession {
  const reservedAt = now();
  const reservation = {
    playerId,
    reservedAt,
    expiresAt: new Date(Date.now() + RESERVATION_DURATION_MS).toISOString(),
  };

  return { game: { ...game, reservation, updatedAt: reservedAt }, reservation };
}

/**
 * Local persistence is a temporary client adapter. Its exported methods form
 * the same boundary that a future HTTP/Fastify repository will implement.
 */
export const localGameRepository = {
  claimPlayableGame(playerId: PlayerId): PlaySession {
    let games = expireReservations(readGames());

    const existingReservation = games.find((game) =>
      isReservationActive(game) && game.reservation?.playerId === playerId,
    );
    if (existingReservation?.reservation) {
      writeGames(games);
      return { game: existingReservation, reservation: existingReservation.reservation };
    }

    let candidate = games
      .filter((game) => game.status === 'active')
      .filter((game) => !isReservationActive(game))
      .filter((game) => canPlayerMove(game, playerId))
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))[0];

    if (!candidate) {
      candidate = createGame(playerId);
      games = [...games, candidate];
    }

    const session = reserve(candidate, playerId);
    games = games.map((game) => game.id === session.game.id ? session.game : game);
    writeGames(games);
    return session;
  },

  getGame(gameId: string): Game | null {
    const games = expireReservations(readGames());
    writeGames(games);
    return games.find((game) => game.id === gameId) ?? null;
  },

  getActiveBoards(playerId: PlayerId): Game[] {
    const games = expireReservations(readGames());
    writeGames(games);
    return games
      .filter((game) => game.creatorId === playerId || participantFor(game, playerId) !== undefined)
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  },

  submitMove(gameId: string, playerId: PlayerId, from: string, to: string): Game {
    const games = expireReservations(readGames());
    const game = games.find((item) => item.id === gameId);
    if (!game) throw new Error('This board is no longer available.');
    if (!game.reservation || game.reservation.playerId !== playerId || !isReservationActive(game)) {
      throw new Error('Your five-minute move window has ended.');
    }

    const chess = new Chess(game.currentFen);
    const move = chess.move({ from, to, promotion: 'q' });
    if (!move) throw new Error('That is not a legal chess move.');

    const moveRecord: MoveRecord = {
      id: crypto.randomUUID(),
      ply: game.moves.length + 1,
      playerId,
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
      san: move.san,
      fenAfter: chess.fen(),
      createdAt: now(),
    };

    const existingParticipant = participantFor(game, playerId);
    const participant: GameParticipant = {
      playerId,
      status: 'moved',
      lastMovePly: moveRecord.ply,
      joinedAt: existingParticipant?.joinedAt ?? now(),
      timedOutAt: null,
    };
    const nextGame: Game = {
      ...game,
      status: chess.isGameOver() ? 'completed' : 'active',
      currentFen: chess.fen(),
      moves: [...game.moves, moveRecord],
      participants: existingParticipant
        ? game.participants.map((item) => item.playerId === playerId ? participant : item)
        : [...game.participants, participant],
      reservation: null,
      updatedAt: now(),
    };

    writeGames(games.map((item) => item.id === gameId ? nextGame : item));
    return nextGame;
  },
};
