import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';

const uploadMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
      }),
    },
  }),
}));

vi.mock('../security/wifeValidator', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignature: vi.fn(),
  wifeForbiddenResponse: () =>
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

vi.mock('../security/fileValidator', () => ({
  validateFileBuffer: vi.fn(),
  verifyFileContentHash: vi.fn(),
}));

import { POST } from './route';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
} from '../security/wifeValidator';
import { validateFileBuffer, verifyFileContentHash } from '../security/fileValidator';

function buildUploadRequest(): Request {
  const fd = new FormData();
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], 'proof.jpg', { type: 'image/jpeg' });
  fd.append('file', file);
  const headers = new Headers({
    'x-wife-content-hash': 'a'.repeat(64),
    'content-type': 'multipart/form-data; boundary=test-boundary',
  });
  const reqLike = {
    method: 'POST',
    url: 'http://127.0.0.1/api/upload',
    headers,
    formData: async () => fd,
  } as unknown as Request;
  return reqLike;
}

describe('upload route security checkpoints', () => {
  beforeEach(() => {
    (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    (extractUserTokenFromRequest as unknown as ReturnType<typeof vi.fn>).mockReturnValue('token');
    (isTokenAuthorized as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (verifyWifeSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (getVerifiedTokenSubject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('user-1');
    (verifyFileContentHash as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (validateFileBuffer as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    uploadMock.mockResolvedValue({ error: null });
  });

  it('returns 401 when token is missing/unauthorized', async () => {
    (extractUserTokenFromRequest as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const res = await POST(buildUploadRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 on failed WIFE signature', async () => {
    (verifyWifeSignature as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await POST(buildUploadRequest());
    expect(res.status).toBe(403);
  });

  it('returns 403 when multipart content hash header is missing', async () => {
    const req = buildUploadRequest();
    (req.headers as Headers).delete('x-wife-content-hash');
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

