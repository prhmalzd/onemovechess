import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { getSupabaseServiceRoleKey } from '../env';

const puzzles = [
  { piece: '♞', pieceName: 'knight', from: 'd3', to: 'b4' },
  { piece: '♞', pieceName: 'knight', from: 'b3', to: 'c5' },
  { piece: '♜', pieceName: 'rook', from: 'c2', to: 'c5' },
  { piece: '♝', pieceName: 'bishop', from: 'b2', to: 'e5' },
  { piece: '♛', pieceName: 'queen', from: 'd2', to: 'a5' },
  { piece: '♚', pieceName: 'king', from: 'c3', to: 'd4' },
] as const;

type CaptchaPayload = { expiresAt: number; solution: string };

function sign(payload: string): string {
  return createHmac('sha256', getSupabaseServiceRoleKey()).update(payload).digest('base64url');
}

export function createCaptchaChallenge() {
  const puzzle = puzzles[randomInt(puzzles.length)]!;
  const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + 10 * 60_000, solution: puzzle.to } satisfies CaptchaPayload)).toString('base64url');
  return { puzzle, token: `${payload}.${sign(payload)}` };
}

export function isValidCaptchaChallenge(token: string, solution: string): boolean {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expectedSignature = sign(payload);
  if (signature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return false;
  try {
    const challenge = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CaptchaPayload;
    return challenge.expiresAt > Date.now() && challenge.solution === solution;
  } catch {
    return false;
  }
}
