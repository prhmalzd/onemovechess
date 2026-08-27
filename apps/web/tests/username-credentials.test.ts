import { describe, expect, it } from 'vitest';
import { getPasswordStrength, isValidUsername, normalizeUsername, usernameLoginEmail } from '../src/shared/auth/username-credentials';

describe('username credentials', () => {
  it('normalizes and validates usernames consistently', () => {
    expect(normalizeUsername('  Chess_Player  ')).toBe('chess_player');
    expect(isValidUsername('Chess_Player')).toBe(true);
    expect(isValidUsername('no spaces')).toBe(false);
    expect(isValidUsername('ab')).toBe(false);
    expect(usernameLoginEmail('Chess_Player')).toBe('chess_player@users.onemovechess.local');
  });

  it('scores password strength without rejecting weaker passwords', () => {
    expect(getPasswordStrength('x')).toEqual({ score: 1, label: 'Weak' });
    expect(getPasswordStrength('chessmove42')).toEqual({ score: 3, label: 'Fair' });
    expect(getPasswordStrength('ChessMove!42')).toEqual({ score: 5, label: 'Strong' });
  });
});
