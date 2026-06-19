import { beforeEach, describe, expect, it, vi } from 'vitest';

const removeMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        remove: removeMock,
      }),
    },
  }),
}));

vi.mock('../../security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignature: vi.fn(),
  wifeForbiddenResponse: () =>
    new Response(JSON.stringify({ ok: false, error: 'Cryptographic verification failed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  wifeSignatureFailedResponse: () =>
    new Response(JSON.stringify({ ok: false, error: 'Cryptographic verification failed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  wifeUnauthorizedResponse: () =>
    new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
}));

import { POST } from './route';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
} from '../../security/wifeValidator.ts';

function buildRemoveRequest(paths: string[]): Request {
  return new Request('http://127.0.0.1/api/upload/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  });
}

describe('upload remove route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    (extractUserTokenFromRequest as ReturnType<typeof vi.fn>).mockReturnValue('token');
    (isTokenAuthorized as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (verifyWifeSignature as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getVerifiedTokenSubject as ReturnType<typeof vi.fn>).mockResolvedValue('user-1');
    removeMock.mockResolvedValue({ error: null });
  });

  it('returns 403 when path belongs to another user', async () => {
    const res = await POST(buildRemoveRequest(['user-2/vault/file.pdf']));
    expect(res.status).toBe(403);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('returns 200 and removes owned paths', async () => {
    const res = await POST(buildRemoveRequest(['user-1/vault/old.pdf']));
    expect(res.status).toBe(200);
    expect(removeMock).toHaveBeenCalledWith(['user-1/vault/old.pdf']);
  });
});
