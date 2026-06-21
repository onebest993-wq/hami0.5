import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';

const uploadMock = vi.fn();
const signedUrlMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        createSignedUrl: signedUrlMock,
      }),
    },
  }),
}));

vi.mock('../security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignature: vi.fn(),
  assertWifeSignatureRequest: vi.fn(async () => null),
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

vi.mock('../security/fileValidator.ts', () => ({
  validateFileBuffer: vi.fn(),
  verifyFileContentHash: vi.fn(),
}));

vi.mock('../../services/server/MalwareScanService.ts', () => ({
  scanBufferForMalware: vi.fn().mockResolvedValue({ safe: true }),
}));

import { POST } from './route';
import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  assertWifeSignatureRequest,
  wifeSignatureFailedResponse,
} from '../security/wifeValidator.ts';
import { validateFileBuffer, verifyFileContentHash } from '../security/fileValidator.ts';

function jpegTestFile(): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
  const file = new File([bytes], 'proof.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
}

function buildUploadRequest(): Request {
  const fd = new FormData();
  fd.append('file', jpegTestFile());
  fd.append('category', 'vault');
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
    vi.mocked(assertWifeSignatureRequest).mockResolvedValue(null);
    (getVerifiedTokenSubject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('user-1');
    (verifyFileContentHash as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (validateFileBuffer as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    uploadMock.mockResolvedValue({ error: null });
    signedUrlMock.mockResolvedValue({ data: { signedUrl: 'https://example.test/signed' }, error: null });
  });

  it('returns 401 when token is missing/unauthorized', async () => {
    (extractUserTokenFromRequest as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const res = await POST(buildUploadRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 on failed WIFE signature', async () => {
    vi.mocked(assertWifeSignatureRequest).mockResolvedValue(
      wifeSignatureFailedResponse({ method: 'POST', url: 'http://127.0.0.1/api/upload' } as Request),
    );
    const res = await POST(buildUploadRequest());
    expect(res.status).toBe(403);
  });

  it('returns 403 when multipart content hash header is missing', async () => {
    const req = buildUploadRequest();
    (req.headers as Headers).delete('x-wife-content-hash');
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when category is invalid', async () => {
    const fd = new FormData();
    fd.append('file', jpegTestFile());
    fd.append('category', 'not-a-real-category');
    const headers = new Headers({
      'x-wife-content-hash': 'a'.repeat(64),
    });
    const req = {
      method: 'POST',
      url: 'http://127.0.0.1/api/upload',
      headers,
      formData: async () => fd,
    } as unknown as Request;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 with signed downloadUrl on success', async () => {
    const res = await POST(buildUploadRequest());
    const body = (await res.json()) as { ok?: boolean; downloadUrl?: string; path?: string; error?: string };
    if (res.status !== 200) {
      throw new Error(`expected 200 got ${res.status}: ${JSON.stringify(body)}`);
    }
    expect(body.ok).toBe(true);
    expect(body.downloadUrl).toContain('https://');
    expect(body.path).toMatch(/^user-1\/vault\//);
  });
});

