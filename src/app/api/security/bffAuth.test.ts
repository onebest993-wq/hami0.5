import { beforeEach, describe, expect, it, vi } from 'vitest';

const restrictionMock = vi.fn();
const isPlatformAdminMock = vi.fn();

vi.mock('./wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenIdentity: vi.fn(),
  verifyWifeSignatureStatus: vi.fn(),
  wifeRateLimitedResponse: () => new Response(null, { status: 429 }),
  wifeSignatureFailedResponse: () => new Response(null, { status: 403 }),
  wifeUnauthorizedResponse: () => new Response(null, { status: 401 }),
  wifeAccountLockedResponse: (meta: { message?: string }) =>
    new Response(JSON.stringify({ ok: false, code: 'ACCOUNT_LOCKED', error: meta.message }), {
      status: 403,
    }),
  wifeAccountFrozenResponse: (meta: { message?: string }) =>
    new Response(JSON.stringify({ ok: false, code: 'ACCOUNT_FROZEN', error: meta.message }), {
      status: 403,
    }),
}));

vi.mock('./wifeUserStatus.ts', () => ({
  getWifeUserRestrictionLive: (...a: unknown[]) => restrictionMock(...a),
}));

vi.mock('./roleResolver.ts', () => ({
  isPlatformAdminUserId: (...a: unknown[]) => isPlatformAdminMock(...a),
}));

import { requireWifeUser } from './bffAuth.ts';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenIdentity,
  verifyWifeSignatureStatus,
} from './wifeValidator.ts';

describe('requireWifeUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractUserTokenFromRequest).mockReturnValue('token');
    vi.mocked(getVerifiedTokenIdentity).mockResolvedValue('user-a');
    vi.mocked(verifyWifeSignatureStatus).mockResolvedValue('valid');
    isPlatformAdminMock.mockResolvedValue(false);
    restrictionMock.mockResolvedValue({
      loginAllowed: true,
      frozen: false,
      freezeUntil: null,
      loginUntil: null,
      deleted: false,
    });
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

  it('returns 403 ACCOUNT_LOCKED when login is locked', async () => {
    restrictionMock.mockResolvedValue({
      loginAllowed: false,
      frozen: false,
      freezeUntil: null,
      loginUntil: null,
      deleted: false,
    });
    const res = await requireWifeUser(new Request('http://127.0.0.1/api/test'));
    expect(res.ok).toBe(false);
    if (res.ok === false) {
      expect(res.response.status).toBe(403);
      const body = (await res.response.json()) as { code?: string; error?: string };
      expect(body.code).toBe('ACCOUNT_LOCKED');
      expect(body.error).toContain('قفل الدخول');
    }
  });

  it('allows locked identity when allowLoginLocked is set', async () => {
    restrictionMock.mockResolvedValue({
      loginAllowed: false,
      frozen: false,
      freezeUntil: null,
      loginUntil: null,
      deleted: false,
    });
    const res = await requireWifeUser(new Request('http://127.0.0.1/api/test'), {
      allowLoginLocked: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.userId).toBe('user-a');
  });

  it('keeps frozen accounts on session routes unless rejectFrozen is set', async () => {
    restrictionMock.mockResolvedValue({
      loginAllowed: true,
      frozen: true,
      freezeUntil: null,
      loginUntil: null,
      deleted: false,
    });
    const allowed = await requireWifeUser(new Request('http://127.0.0.1/api/test'));
    expect(allowed.ok).toBe(true);
    const blocked = await requireWifeUser(new Request('http://127.0.0.1/api/test'), {
      rejectFrozen: true,
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok === false) {
      expect(blocked.response.status).toBe(403);
      const body = (await blocked.response.json()) as { code?: string; error?: string };
      expect(body.code).toBe('ACCOUNT_FROZEN');
      expect(body.error).toContain('تجميد');
    }
  });
});
