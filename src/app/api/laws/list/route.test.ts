import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectMock = vi.fn();
const eqMock = vi.fn();
const inMock = vi.fn();

function chainOrderResult(result: { data: unknown[]; error: null }) {
  const order2 = vi.fn().mockResolvedValue(result);
  const order1 = vi.fn().mockReturnValue({ order: order2 });
  return { order: order1 };
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: selectMock.mockReturnValue({
        eq: eqMock,
        in: inMock,
      }),
    }),
  }),
}));

vi.mock('../../security/bffAuth.ts', () => ({
  requireWifeUser: vi.fn(async () => ({ userId: 'user-a', token: 'token' })),
  unwrapWifeUser: (v: unknown) => v,
}));

vi.mock('../../security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignature: vi.fn(),
  assertWifeSignatureRequest: vi.fn(async () => null),
  wifeForbiddenResponse: () => new Response(null, { status: 403 }),
  wifeUnauthorizedResponse: () => new Response(null, { status: 401 }),
}));

vi.mock('../../security/sanitizer.ts', () => ({
  sanitizePayload: (v: unknown) => v,
}));

import { POST } from './route';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
} from '../../security/wifeValidator.ts';
import { EXECUTION_LAW_CANONICAL_NAME } from '@/app/constants/iraqiLawCatalog';

describe('laws list route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    vi.mocked(extractUserTokenFromRequest).mockReturnValue('token');
    vi.mocked(isTokenAuthorized).mockResolvedValue(true);
    vi.mocked(verifyWifeSignature).mockResolvedValue(true);
    vi.mocked(getVerifiedTokenSubject).mockResolvedValue('user-a');
    eqMock.mockReturnValue(chainOrderResult({ data: [{ id: '1' }], error: null }));
    inMock.mockReturnValue(chainOrderResult({ data: [], error: null }));
  });

  it('rejects unknown law names', async () => {
    const res = await POST(
      new Request('http://127.0.0.1/api/laws/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ law_name: 'قانون غير مسموح' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns items for allowed law name', async () => {
    const res = await POST(
      new Request('http://127.0.0.1/api/laws/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ law_name: EXECUTION_LAW_CANONICAL_NAME }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; items?: unknown[] };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
  });
});
