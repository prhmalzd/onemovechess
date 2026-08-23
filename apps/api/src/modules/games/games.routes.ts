import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requirePlayer } from '../../shared/auth.js';
import { GameError, gamesService } from './games.service.js';

const gameIdParams = z.object({ gameId: z.string().uuid() });
const moveBody = z.object({
  from: z.string().regex(/^[a-h][1-8]$/),
  to: z.string().regex(/^[a-h][1-8]$/),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
  expectedVersion: z.number().int().positive(),
});

function asHttpError(error: unknown): never {
  if (error instanceof GameError) throw error;
  throw error;
}

export async function gamesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requirePlayer);

  app.post('/claim', async (request) => gamesService.claimPlayableGame(request.playerId));
  app.get('/active-boards', async (request) => gamesService.getActiveBoards(request.playerId));
  app.get('/:gameId', async (request) => {
    const { gameId } = gameIdParams.parse(request.params);
    return gamesService.getGame(gameId);
  });
  app.post('/:gameId/moves', async (request) => {
    const { gameId } = gameIdParams.parse(request.params);
    return gamesService.submitMove({ gameId, playerId: request.playerId, ...moveBody.parse(request.body) });
  });
  app.post('/:gameId/abort', async (request, reply) => {
    const { gameId } = gameIdParams.parse(request.params);
    await gamesService.abortFirstMoveGame(gameId, request.playerId);
    return reply.code(204).send();
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof GameError) return reply.code(error.statusCode).send({ message: error.message });
    if (error instanceof z.ZodError) return reply.code(400).send({ message: 'The request data is invalid.' });
    app.log.error(error);
    return reply.code(500).send({ message: 'An unexpected server error occurred.' });
  });
}
