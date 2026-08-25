import cors from '@fastify/cors';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { gamesRoutes } from './modules/games/games.routes.js';

type AppOptions = {
  routePrefix?: string;
};

export function buildApp({ routePrefix = '' }: AppOptions = {}) {
  const app = Fastify({ logger: true });

  // The production frontend and API share one Vercel origin, so CORS is only
  // needed for the separate Vite/Fastify origins used during local development.
  if (env.NODE_ENV !== 'production' && env.CORS_ORIGIN) {
    void app.register(cors, {
      origin(origin, callback) {
        const isConfiguredOrigin = origin === env.CORS_ORIGIN;
        const isLocalDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');
        callback(null, isConfiguredOrigin || isLocalDevelopmentOrigin);
      },
      credentials: false,
    });
  }

  app.get(`${routePrefix}/health`, async () => ({ status: 'ok' }));
  void app.register(gamesRoutes, { prefix: `${routePrefix}/v1/games` });
  return app;
}
