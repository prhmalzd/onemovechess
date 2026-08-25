import cors from '@fastify/cors';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { gamesRoutes } from './modules/games/games.routes.js';

type AppOptions = {
  routePrefix?: string;
};

export function buildApp({ routePrefix = '' }: AppOptions = {}) {
  const app = Fastify({ logger: true });

  // Same-origin production deployments do not need CORS. Keeping this
  // configured when an origin is supplied also supports two Vercel projects
  // during a transition (for example, web and api deployed separately).
  if (env.CORS_ORIGIN) {
    void app.register(cors, {
      origin(origin, callback) {
        const isConfiguredOrigin = origin === env.CORS_ORIGIN;
        const isLocalDevelopmentOrigin = env.NODE_ENV !== 'production'
          && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');
        callback(null, isConfiguredOrigin || isLocalDevelopmentOrigin);
      },
      credentials: false,
    });
  }

  app.get(`${routePrefix}/health`, async () => ({ status: 'ok' }));
  void app.register(gamesRoutes, { prefix: `${routePrefix}/v1/games` });
  return app;
}
