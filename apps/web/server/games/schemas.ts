import { z } from 'zod';

export const gameIdParams = z.object({ gameId: z.string().uuid() });
export const moveBody = z.object({
  from: z.string().regex(/^[a-h][1-8]$/),
  to: z.string().regex(/^[a-h][1-8]$/),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
  expectedVersion: z.number().int().positive(),
});
