import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignature: vi.fn(),
  wifeForbiddenResponse: () => new Response(null, { status: 403 }),
  wifeUnauthorizedResponse: () => new Response(null, { status: 401 }),
}));

import { requireWifeUser } from './bffAuth.ts';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
} from './wifeValidator.ts';

describe('requireWifeUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractUserTokenFromRequest).mockReturnValue('token');
    vi.mocked(isTokenAuthorized).mockResolvedValue(true);
    vi.mocked(verifyWifeSignature).mockResolvedValue(true);
    vi.mocked(getVerifiedTokenSubject).mockResolvedValue('user-a');
  });

  it('returns userId when WIFE auth passes', async () => {
    const res = await requireWifeUser(new Request('http://127.0.0.1/api/test'));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.userId).toBe('user-a');
  });

  it('returns 403 when signature fails', async () => {
    vi.mocked(verifyWifeSignature).mockResolvedValue(false);
    const res = await requireWifeUser(new Request('http://127.0.0.1/api/test'));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.response.status).toBe(403);
  });
});
