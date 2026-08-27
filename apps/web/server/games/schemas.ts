import { z } from 'zod';
import { normalizeUsername, USERNAME_PATTERN } from '../../src/shared/auth/username-credentials';

export const gameIdParams = z.object({ gameId: z.string().uuid() });
export const moveBody = z.object({
  from: z.string().regex(/^[a-h][1-8]$/),
  to: z.string().regex(/^[a-h][1-8]$/),
  promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
  expectedVersion: z.number().int().positive(),
});

export const playerProfileBody = z.object({
  displayName: z.string().trim().min(1).max(24),
});

export const accountUpgradeBody = z.object({
  username: z.string().transform(normalizeUsername).pipe(z.string().regex(USERNAME_PATTERN)),
  password: z.string().min(1),
  captchaToken: z.string().min(1),
  captchaSolution: z.string().regex(/^[a-e][1-5]$/),
});
