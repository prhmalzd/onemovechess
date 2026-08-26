import { describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser } }) }));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/postgres';

import { POST as claimGame } from '../../app/api/v1/games/claim/route';

describe('authenticated game routes', () => {
  it('rejects a missing bearer token', async () => {
    const response = await claimGame(new Request('http://test/api/v1/games/claim', { method: 'POST' }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: 'A Supabase access token is required.' });
  });

  it('rejects an invalid bearer token', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
    const response = await claimGame(new Request('http://test/api/v1/games/claim', {
      method: 'POST', headers: { authorization: 'Bearer bad-token' },
    }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: 'Your Supabase session is invalid or has expired.' });
  });
});
