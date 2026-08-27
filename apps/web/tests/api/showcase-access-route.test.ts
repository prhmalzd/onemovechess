import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock('../../server/auth/require-player', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

import { GET } from '../../app/api/v1/showcase/access/route';

describe('GET /api/v1/showcase/access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the parham account to view the private showcase', async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ email: 'parham@users.onemovechess.local' });

    const response = await GET(new Request('http://localhost/api/v1/showcase/access'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: true });
  });

  it('rejects every other account', async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ email: 'someone-else@users.onemovechess.local' });

    const response = await GET(new Request('http://localhost/api/v1/showcase/access'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ message: 'This preview is only available to its owner.' });
  });
});
