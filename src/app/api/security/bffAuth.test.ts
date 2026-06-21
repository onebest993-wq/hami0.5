import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignatureStatus: vi.fn(),
  wifeRateLimitedResponse: () => new Response(null, { status: 429 }),
  wifeSignatureFailedResponse: () => new Response(null, { status: 403 }),
  wifeUnauthorizedResponse: () => new Response(null, { status: 401 }),
}));

import { requireWifeUser } from './bffAuth.ts';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignatureStatus,
} from './wifeValidator.ts';

describe('requireWifeUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractUserTokenFromRequest).mockReturnValue('token');
    vi.mocked(isTokenAuthorized).mockResolvedValue(true);
    vi.mocked(verifyWifeSignatureStatus).mockResolvedValue('valid');
    vi.mocked(getVerifiedTokenSubject).mockResolvedValue('user-a');
  });

  it('returns userId when WIFE auth passes', async () => {
    const res = await requireWifeUser(new Request('http://127.0.0.1/api/test'));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.userId).toBe('user-a');
  });

  it('returns 403 when signature fails', async () => {
    vi.mocked(verifyWifeSignatureStatus).mockResolvedValue('invalid');
    const res = await requireWifeUser(new Request('http://127.0.0.1/api/test'));
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.response.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(verifyWifeSignatureStatus).mockResolvedValue('rate_limited');
    const res = await requireWifeUser(new Request('http://127.0.0.1/api/test'));
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.response.status).toBe(429);
  });
});
