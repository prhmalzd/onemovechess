import { Chess } from 'chess.js';
import { prisma } from '../database/prisma';
import { GameError } from '../games/games.service';
import { classifyMove, movingPlayerImpact } from './analysis-metrics';
import { stockfishService } from './stockfish.service';

const basicDepth = Number(process.env.STOCKFISH_DEPTH_BASIC ?? 12);
export const analysisService = {
  async request(gameId: string, playerId: string) {
    const existing = await prisma.gameAnalysis.findFirst({ where: { gameId, analysisKind: 'basic', engineVersion: stockfishService.engineVersion, depth: basicDepth } });
    if (existing) return existing;
    return prisma.$transaction(async (db) => {
      await db.$executeRaw`select pg_advisory_xact_lock(hashtext(${playerId}))`;
      const game = await db.game.findUnique({ where: { id: gameId }, select: { status: true, participants: { where: { playerId }, select: { playerId: true } } } });
      if (!game || game.participants.length === 0) throw new GameError('You can only analyze a board you joined.', 403);
      if (game.status !== 'completed') throw new GameError('Analysis is available after the game is complete.', 409);
      const entitlement = await db.analysisEntitlement.upsert({ where: { playerId }, create: { playerId, basicAnalysisUsed: true }, update: {} });
      if (entitlement.basicAnalysisUsed) throw new GameError('Your free basic analysis has already been used.', 403);
      return db.gameAnalysis.create({ data: { gameId, requestedById: playerId, engineVersion: stockfishService.engineVersion, depth: basicDepth } });
    });
  },
  async run(id: string) {
    const analysis = await prisma.gameAnalysis.update({ where: { id }, data: { status: 'running', errorMessage: null }, include: { game: { include: { moves: { orderBy: { ply: 'asc' } } } } } });
    try {
      const chess = new Chess(analysis.game.startingFen); const positions = new Map<string, Awaited<ReturnType<typeof stockfishService.analyzePosition>>>();
      const evaluate = async (fen: string) => { const cached = positions.get(fen); if (cached) return cached; const next = await stockfishService.analyzePosition({ fen, depth: analysis.depth }); positions.set(fen, next); return next; };
      const rows = [];
      for (const move of analysis.game.moves) {
        const fenBefore = chess.fen(); const before = await evaluate(fenBefore);
        const played = chess.move({ from: move.fromSquare, to: move.toSquare, ...(move.promotion ? { promotion: move.promotion as 'q' | 'r' | 'b' | 'n' } : {}) });
        if (!played) throw new Error(`Stored move ${move.id} cannot be reconstructed.`);
        const fenAfter = chess.fen(); const after = await evaluate(fenAfter); const color = move.color === 'black' ? 'black' : 'white'; const impact = movingPlayerImpact(before.evaluation, after.evaluation, color);
        rows.push({ analysisId: analysis.id, gameId: analysis.gameId, moveId: move.id, ply: move.ply, playerId: move.playerId, fenBefore, fenAfter, playedMove: `${move.fromSquare}${move.toSquare}${move.promotion ?? ''}`, bestMove: before.bestMove, principalVariation: before.pv, evaluationBefore: before.evaluation, evaluationAfter: after.evaluation, impact, classification: classifyMove(impact), depth: analysis.depth });
      }
      await prisma.$transaction([prisma.moveAnalysis.deleteMany({ where: { analysisId: analysis.id } }), prisma.moveAnalysis.createMany({ data: rows }), prisma.gameAnalysis.update({ where: { id }, data: { status: 'completed', completedAt: new Date() } })]);
    } catch (error) { await prisma.gameAnalysis.update({ where: { id }, data: { status: 'failed', errorMessage: error instanceof Error ? error.message : 'Analysis failed.' } }); }
  },
  async get(gameId: string, playerId: string) {
    const access = await prisma.gameParticipant.findUnique({ where: { gameId_playerId: { gameId, playerId } } }); if (!access) throw new GameError('You can only view analysis for a board you joined.', 403);
    const analysis = await prisma.gameAnalysis.findFirst({ where: { gameId }, orderBy: { createdAt: 'desc' }, include: { moveAnalyses: { orderBy: { ply: 'asc' } } } });
    if (!analysis) throw new GameError('No analysis has been requested for this board.', 404);
    return analysis;
  },
};
