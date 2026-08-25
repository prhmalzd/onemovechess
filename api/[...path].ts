import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../apps/api/src/app';

const app = buildApp({ routePrefix: '/api' });
const ready = app.ready();

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  await ready;
  app.server.emit('request', request, response);
}
