import { Chess } from 'chess.js';
import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../database/prisma';

const RESERVATION_DURATION_MS = 5 * 60 * 1000;

const gameDetails = {
  moves: { orderBy: { ply: 'asc' }, include: { player: { select: { displayName: true } } } },
  participants: { include: { player: { select: { displayName: true } } } },
  reservation: true,
} satisfies Prisma.GameInclude;

type Database = PrismaClient | Prisma.TransactionClient;
type GameDetails = Prisma.GameGetPayload<{ include: typeof gameDetails }>;

export class GameError extends Error {
  constructor(message: string, readonly statusCode: number) { super(message); }
}

function serializeGame(game: GameDetails) {
  return {
    id: game.id, creatorId: game.creatorId, status: game.status, startingFen: game.startingFen,
    currentFen: game.currentFen, currentPly: game.currentPly, moveDistance: game.moveDistance,
    version: game.version, createdAt: game.createdAt.toISOString(), updatedAt: game.updatedAt.toISOString(),
    moves: game.moves.map((move) => ({
      id: move.id, ply: move.ply, playerId: move.playerId, playerName: move.player.displayName, color: move.color, from: move.fromSquare,
      to: move.toSquare, ...(move.promotion ? { promotion: move.promotion } : {}), san: move.san,
      fenAfter: move.fenAfter, createdAt: move.createdAt.toISOString(),
    })),
    participants: game.participants.map((participant) => ({
      playerId: participant.playerId, playerName: participant.player.displayName, status: participant.status, lastMovePly: participant.lastMovePly,
      joinedAt: participant.joinedAt.toISOString(), timedOutAt: participant.timedOutAt?.toISOString() ?? null,
    })),
    reservation: game.reservation ? {
      playerId: game.reservation.playerId, reservedAt: game.reservation.reservedAt.toISOString(),
      expiresAt: game.reservation.expiresAt.toISOString(),
    } : null,
  };
}

async function requirePlayerProfile(database: Database, playerId: string): Promise<void> {
  const player = await database.player.findUnique({ where: { id: playerId } });
  if (!player) throw new GameError('Your player profile is still being created. Please retry in a moment.', 409);
}

async function clearExpiredReservations(database: Prisma.TransactionClient): Promise<void> {
  const expiredReservations = await database.gameReservation.findMany({
    where: { expiresAt: { lte: new Date() } }, select: { gameId: true }, orderBy: { gameId: 'asc' },
  });
  for (const expiredReservation of expiredReservations) {
    const lockedGames = await database.$queryRaw<Array<{ id: string }>>`
      select id from public.games where id = ${expiredReservation.gameId}::uuid for update skip locked
    `;
    if (lockedGames.length === 0) continue;
    const reservation = await database.gameReservation.findUnique({
      where: { gameId: expiredReservation.gameId }, include: { game: true },
    });
    if (!reservation || reservation.expiresAt > new Date()) continue;
    if (reservation.game.currentPly === 0 && reservation.game.creatorId === reservation.playerId) {
      await database.gameReservation.delete({ where: { gameId: reservation.gameId } });
      await database.gameParticipant.deleteMany({ where: { gameId: reservation.gameId } });
      await database.game.delete({ where: { id: reservation.gameId } });
      continue;
    }
    await database.gameReservation.delete({ where: { gameId: reservation.gameId } });
    await database.gameParticipant.upsert({
      where: { gameId_playerId: { gameId: reservation.gameId, playerId: reservation.playerId } },
      create: { gameId: reservation.gameId, playerId: reservation.playerId, status: 'timed_out', timedOutAt: new Date() },
      update: { status: 'timed_out', timedOutAt: new Date() },
    });
  }
}

async function getGameDetails(database: Database, gameId: string): Promise<GameDetails> {
  const game = await database.game.findUnique({ where: { id: gameId }, include: gameDetails });
  if (!game) throw new GameError('This board is no longer available.', 404);
  return game;
}

async function lockEligibleGame(database: Prisma.TransactionClient, playerId: string): Promise<string | null> {
  const candidate = await database.$queryRaw<Array<{ id: string }>>`
    select g.id from public.games g left join public.game_participants gp
      on gp.game_id = g.id and gp.player_id = ${playerId}::uuid
    where g.status = 'active' and (gp.player_id is null or (gp.status <> 'timed_out'
      and (gp.last_move_ply is null or g.current_ply - gp.last_move_ply >= g.move_distance)))
      and not exists (select 1 from public.game_reservations gr where gr.game_id = g.id and gr.expires_at > now())
    order by g.updated_at desc for update of g skip locked limit 1
  `;
  return candidate[0]?.id ?? null;
}

async function lockSpecificEligibleGame(database: Prisma.TransactionClient, playerId: string, gameId: string): Promise<string | null> {
  const candidate = await database.$queryRaw<Array<{ id: string }>>`
    select g.id from public.games g left join public.game_participants gp
      on gp.game_id = g.id and gp.player_id = ${playerId}::uuid
    where g.id = ${gameId}::uuid and g.status = 'active' and (gp.player_id is null or (gp.status <> 'timed_out'
      and (gp.last_move_ply is null or g.current_ply - gp.last_move_ply >= g.move_distance)))
      and not exists (select 1 from public.game_reservations gr where gr.game_id = g.id and gr.expires_at > now())
    for update of g skip locked limit 1
  `;
  return candidate[0]?.id ?? null;
}

export const gamesService = {
  async claimPlayableGame(playerId: string, options: { isAnonymous: boolean } = { isAnonymous: false }) {
    return prisma.$transaction(async (database) => {
      await database.$executeRaw`select pg_advisory_xact_lock(hashtext(${playerId}))`;
      await requirePlayerProfile(database, playerId);
      await clearExpiredReservations(database);
      const activeReservation = await database.gameReservation.findFirst({
        where: { playerId, expiresAt: { gt: new Date() } }, include: { game: { include: gameDetails } },
      });
      if (activeReservation) return serializeGame(activeReservation.game);
      if (options.isAnonymous) {
        const existingBoard = await database.gameParticipant.findFirst({ where: { playerId }, select: { gameId: true } });
        if (existingBoard) throw new GameError('Create an account to play another board. You can still view your active board.', 403);
      }
      const candidateId = await lockEligibleGame(database, playerId);
      const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MS);
      if (!candidateId) {
        const initialFen = new Chess().fen();
        return serializeGame(await database.game.create({
          data: { creatorId: playerId, startingFen: initialFen, currentFen: initialFen,
            participants: { create: { playerId } }, reservation: { create: { playerId, expiresAt } } },
          include: gameDetails,
        }));
      }
      await database.gameParticipant.upsert({
        where: { gameId_playerId: { gameId: candidateId, playerId } }, create: { gameId: candidateId, playerId }, update: {},
      });
      await database.gameReservation.create({ data: { gameId: candidateId, playerId, expiresAt } });
      return serializeGame(await getGameDetails(database, candidateId));
    });
  },

  async claimSpecificGame(playerId: string, gameId: string, options: { isAnonymous: boolean } = { isAnonymous: false }) {
    return prisma.$transaction(async (database) => {
      await database.$executeRaw`select pg_advisory_xact_lock(hashtext(${playerId}))`;
      await requirePlayerProfile(database, playerId);
      await clearExpiredReservations(database);
      const activeReservation = await database.gameReservation.findFirst({
        where: { playerId, expiresAt: { gt: new Date() } }, include: { game: { include: gameDetails } },
      });
      if (activeReservation) return serializeGame(activeReservation.game);
      if (options.isAnonymous) {
        const existingBoard = await database.gameParticipant.findFirst({ where: { playerId }, select: { gameId: true } });
        if (existingBoard) throw new GameError('Create an account to play another board. You can still view your active board.', 403);
      }
      const candidateId = await lockSpecificEligibleGame(database, playerId, gameId);
      if (!candidateId) throw new GameError('This board was just claimed by another player. Choose another board.', 409);
      const expiresAt = new Date(Date.now() + RESERVATION_DURATION_MS);
      await database.gameParticipant.upsert({
        where: { gameId_playerId: { gameId: candidateId, playerId } }, create: { gameId: candidateId, playerId }, update: {},
      });
      await database.gameReservation.create({ data: { gameId: candidateId, playerId, expiresAt } });
      return serializeGame(await getGameDetails(database, candidateId));
    });
  },

  async getAvailableBoards(playerId: string, offset: number) {
    const pageSize = 4;
    return prisma.$transaction(async (database) => {
      await requirePlayerProfile(database, playerId);
      await clearExpiredReservations(database);
      const rows = await database.$queryRaw<Array<{ id: string; current_fen: string; current_ply: number; player_count: number; updated_at: Date }>>`
        select g.id, g.current_fen, g.current_ply, g.updated_at,
          (select count(*)::int from public.game_participants participants where participants.game_id = g.id) as player_count
        from public.games g left join public.game_participants gp
          on gp.game_id = g.id and gp.player_id = ${playerId}::uuid
        where g.status = 'active' and (gp.player_id is null or (gp.status <> 'timed_out'
          and (gp.last_move_ply is null or g.current_ply - gp.last_move_ply >= g.move_distance)))
          and exists (select 1 from public.moves moves where moves.game_id = g.id and moves.player_id <> ${playerId}::uuid)
          and not exists (select 1 from public.game_reservations gr where gr.game_id = g.id and gr.expires_at > now())
        order by g.updated_at desc limit ${pageSize + 1} offset ${offset}
      `;
      const boards = rows.slice(0, pageSize).map((row) => ({
        id: row.id, currentFen: row.current_fen, currentPly: row.current_ply, playerCount: row.player_count, updatedAt: row.updated_at.toISOString(),
      }));
      return { boards, nextOffset: rows.length > pageSize ? offset + pageSize : null };
    });
  },

  async getGame(gameId: string) {
    return prisma.$transaction(async (database) => {
      await clearExpiredReservations(database);
      return serializeGame(await getGameDetails(database, gameId));
    });
  },

  async getActiveBoards(playerId: string) {
    return prisma.$transaction(async (database) => {
      await clearExpiredReservations(database);
      const games = await database.game.findMany({ where: { participants: { some: { playerId } } }, orderBy: { updatedAt: 'desc' }, include: gameDetails });
      return games.map(serializeGame);
    });
  },

  async submitMove(input: { gameId: string; playerId: string; from: string; to: string; promotion?: string | undefined; expectedVersion: number }) {
    return prisma.$transaction(async (database) => {
      await clearExpiredReservations(database);
      const locks = await database.$queryRaw<Array<{ id: string }>>`select id from public.games where id = ${input.gameId}::uuid for update`;
      if (locks.length === 0) throw new GameError('This board is no longer available.', 404);
      const game = await getGameDetails(database, input.gameId);
      if (game.status !== 'active') throw new GameError('This game is already complete.', 409);
      if (game.version !== input.expectedVersion) throw new GameError('This board changed. Reload it and try again.', 409);
      if (!game.reservation || game.reservation.playerId !== input.playerId || game.reservation.expiresAt <= new Date()) throw new GameError('Your five-minute move window has ended.', 409);
      const participant = game.participants.find((item) => item.playerId === input.playerId);
      const isEligible = participant?.status !== 'timed_out' && (participant?.lastMovePly === null || participant?.lastMovePly === undefined || game.currentPly - participant.lastMovePly >= game.moveDistance);
      if (!isEligible) throw new GameError('You are not eligible to move on this board yet.', 403);
      const chess = new Chess(game.currentFen);
      let move;
      try { move = chess.move({ from: input.from, to: input.to, ...(input.promotion ? { promotion: input.promotion } : {}) }); }
      catch { throw new GameError('That is not a legal chess move.', 422); }
      if (!move) throw new GameError('That is not a legal chess move.', 422);
      const nextPly = game.currentPly + 1;
      const isComplete = chess.isGameOver();
      await database.move.create({ data: { gameId: game.id, playerId: input.playerId, ply: nextPly, color: move.color === 'w' ? 'white' : 'black', fromSquare: move.from, toSquare: move.to, ...(move.promotion ? { promotion: move.promotion } : {}), san: move.san, fenAfter: chess.fen() } });
      await database.game.update({ where: { id: game.id }, data: { currentFen: chess.fen(), currentPly: nextPly, version: { increment: 1 }, status: isComplete ? 'completed' : 'active', ...(isComplete ? { completedAt: new Date() } : {}), updatedAt: new Date() } });
      await database.gameParticipant.update({ where: { gameId_playerId: { gameId: game.id, playerId: input.playerId } }, data: { status: 'moved', lastMovePly: nextPly, timedOutAt: null } });
      await database.gameReservation.delete({ where: { gameId: game.id } });
      return serializeGame(await getGameDetails(database, game.id));
    });
  },

  async abortFirstMoveGame(gameId: string, playerId: string) {
    return prisma.$transaction(async (database) => {
      const locks = await database.$queryRaw<Array<{ id: string }>>`select id from public.games where id = ${gameId}::uuid for update`;
      if (locks.length === 0) return;
      const game = await getGameDetails(database, gameId);
      const canAbort = game.creatorId === playerId && game.currentPly === 0 && game.reservation?.playerId === playerId && game.reservation.expiresAt > new Date();
      if (!canAbort) throw new GameError('Only the creator can abort an unplayed reserved board.', 409);
      await database.gameReservation.delete({ where: { gameId } });
      await database.gameParticipant.deleteMany({ where: { gameId } });
      await database.game.delete({ where: { id: gameId } });
    });
  },
};
