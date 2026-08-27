import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAnonymousPlayer: vi.fn(),
  updateUserById: vi.fn(),
  upsert: vi.fn(),
  isValidCaptchaChallenge: vi.fn(),
}));

vi.mock('../../server/auth/require-player', () => ({ requireAnonymousPlayer: mocks.requireAnonymousPlayer }));
vi.mock('../../server/auth/supabase-admin', () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { updateUserById: mocks.updateUserById } } }),
}));
vi.mock('../../server/database/prisma', () => ({ prisma: { player: { upsert: mocks.upsert } } }));
vi.mock('../../server/auth/captcha', () => ({ isValidCaptchaChallenge: mocks.isValidCaptchaChallenge }));

import { POST } from '../../app/api/v1/auth/upgrade/route';

describe('account upgrade route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAnonymousPlayer.mockResolvedValue('11111111-1111-4111-8111-111111111111');
    mocks.updateUserById.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ displayName: 'chess_player' });
    mocks.isValidCaptchaChallenge.mockReturnValue(true);
  });

  it('accepts a non-empty password regardless of its strength', async () => {
    const response = await POST(new Request('http://test/api/v1/auth/upgrade', {
      method: 'POST', body: JSON.stringify({ username: 'chess_player', password: 'weak', captchaToken: 'captcha-token', captchaSolution: 'b4' }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalled();
  });

  it('upgrades the anonymous player while preserving their player id', async () => {
    const response = await POST(new Request('http://test/api/v1/auth/upgrade', {
      method: 'POST', body: JSON.stringify({ username: 'Chess_Player', password: 'ChessMove!42', captchaToken: 'captcha-token', captchaSolution: 'b4' }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ username: 'chess_player' });
    expect(mocks.updateUserById).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', expect.objectContaining({
      email: 'chess_player@users.onemovechess.local', password: 'ChessMove!42', email_confirm: true,
    }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '11111111-1111-4111-8111-111111111111' },
      update: { displayName: 'chess_player' },
    }));
  });

  it('maps a duplicate username to the established error shape', async () => {
    mocks.updateUserById.mockResolvedValue({ error: { message: 'User already registered' } });
    const response = await POST(new Request('http://test/api/v1/auth/upgrade', {
      method: 'POST', body: JSON.stringify({ username: 'chess_player', password: 'ChessMove!42', captchaToken: 'captcha-token', captchaSolution: 'b4' }),
    }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ message: 'That username is already taken.' });
  });
});
