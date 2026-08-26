import { ZodError } from 'zod';
import { GameError } from './games/games.service';
import { ServerConfigurationError } from './env';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function jsonError(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ message: error.message }, { status: error.status });
  if (error instanceof GameError) return Response.json({ message: error.message }, { status: error.statusCode });
  if (error instanceof ServerConfigurationError) return Response.json({ message: error.message }, { status: 500 });
  if (error instanceof ZodError) return Response.json({ message: 'The request data is invalid.' }, { status: 400 });
  console.error(error);
  return Response.json({ message: 'An unexpected server error occurred.' }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError('The request data is invalid.', 400);
  }
}
