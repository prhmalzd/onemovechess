import { describe, expect, it } from 'vitest';
import { isStrongPassword, isValidUsername, normalizeUsername, usernameLoginEmail } from '../src/shared/auth/username-credentials';

describe('username credentials', () => {
  it('normalizes and validates usernames consistently', () => {
    expect(normalizeUsername('  Chess_Player  ')).toBe('chess_player');
    expect(isValidUsername('Chess_Player')).toBe(true);
    expect(isValidUsername('no spaces')).toBe(false);
    expect(isValidUsername('ab')).toBe(false);
    expect(usernameLoginEmail('Chess_Player')).toBe('chess_player@users.onemovechess.local');
  });

  it('requires a strong password', () => {
    expect(isStrongPassword('ChessMove!42')).toBe(true);
    expect(isStrongPassword('chessmove42')).toBe(false);
    expect(isStrongPassword('ChessMove42')).toBe(false);
    expect(isStrongPassword('Chess!42')).toBe(false);
  });
});
