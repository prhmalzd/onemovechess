import cors from '@fastify/cors';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { gamesRoutes } from './modules/games/games.routes.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin(origin, callback) {
    const isConfiguredOrigin = origin === env.CORS_ORIGIN;
    const isLocalDevelopmentOrigin = env.NODE_ENV === 'development'
      && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');

    callback(null, isConfiguredOrigin || isLocalDevelopmentOrigin);
  },
  credentials: false,
});

app.get('/health', async () => ({ status: 'ok' }));
await app.register(gamesRoutes, { prefix: '/v1/games' });

async function closeServer(): Promise<void> {
  await app.close();
  await prisma.$disconnect();
}

process.once('SIGINT', () => { void closeServer(); });
process.once('SIGTERM', () => { void closeServer(); });

await app.listen({ port: env.PORT, host: '0.0.0.0' });
