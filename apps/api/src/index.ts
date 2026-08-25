import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { buildApp } from './app.js';

const app = buildApp();

async function closeServer(): Promise<void> {
  await app.close();
  await prisma.$disconnect();
}

process.once('SIGINT', () => { void closeServer(); });
process.once('SIGTERM', () => { void closeServer(); });

await app.listen({ port: env.PORT, host: '0.0.0.0' });
