/**
 * WIFE Upload Destruction — polyglot / SVG / hash tampering (real validators, not mocks).
 * يغطي ما لا تغطيه upload/route.test.ts لأنه ي mock fileValidator.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { validateFileBuffer, verifyFileContentHash } from '@/app/api/security/fileValidator.ts';

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

vi.mock('@/app/api/security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(() => 'drill-token'),
  getVerifiedTokenSubject: vi.fn(async () => 'attacker-user-id'),
  isTokenAuthorized: vi.fn(async () => true),
  verifyWifeSignature: vi.fn(async () => true),
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

vi.mock('@/app/services/server/MalwareScanService.ts', () => ({
  scanBufferForMalware: vi.fn(async () => ({ safe: true })),
}));

import { POST as uploadPost } from '@/app/api/upload/route.ts';
import { scanBufferForMalware } from '@/app/services/server/MalwareScanService.ts';

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function fileFromBuffer(bytes: Buffer, name: string, type: string): File {
  const file = new File([bytes], name, { type });
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  return file;
}

function jpegBytes(extra?: string): Buffer {
  const base = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  if (!extra) return base;
  return Buffer.concat([base, Buffer.from(extra, 'utf8')]);
}

function pdfBytesWith(content: string): Buffer {
  return Buffer.from(`%PDF-1.7\n${content}\n%%EOF`, 'latin1');
}

function buildUploadRequest(file: File, contentHash: string): Request {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category', 'vault');
  return {
    method: 'POST',
    url: 'http://127.0.0.1/api/upload',
    headers: new Headers({
      'x-wife-content-hash': contentHash,
      'content-type': 'multipart/form-data; boundary=drill',
    }),
    formData: async () => fd,
  } as unknown as Request;
}

describe('💥 UPLOAD WAVE 1 — fileValidator polyglot & SVG (real magic bytes)', () => {
  it('rejects bare SVG extension', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf8');
    expect(validateFileBuffer(svg, 'icon.svg')).toBe(false);
  });

  it('rejects JPEG header polyglot embedding <svg> payload', () => {
    const polyglot = jpegBytes('<svg onload="alert(1)"></svg>');
    expect(validateFileBuffer(polyglot, 'photo.jpg')).toBe(false);
  });

  it('rejects PDF magic bytes with .jpg extension (extension spoof)', () => {
    const fakeJpg = Buffer.from('%PDF-1.4 fake jpeg claim', 'utf8');
    expect(validateFileBuffer(fakeJpg, 'evidence.jpg')).toBe(false);
  });

  it('rejects PNG magic with .pdf extension', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(validateFileBuffer(png, 'contract.pdf')).toBe(false);
  });

  it('accepts genuine minimal JPEG', () => {
    expect(validateFileBuffer(jpegBytes(), 'scan.jpg')).toBe(true);
  });

  it('verifyFileContentHash catches swapped bytes after client claimed hash', () => {
    const original = jpegBytes('clean');
    const tampered = jpegBytes('PWNED');
    const claimed = sha256Hex(original);
    expect(verifyFileContentHash(tampered, claimed)).toBe(false);
  });
});

describe('💥 UPLOAD WAVE 2 — upload route post-WIFE file attacks', () => {
  beforeEach(() => {
    (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
    vi.clearAllMocks();
    vi.mocked(scanBufferForMalware).mockResolvedValue({ safe: true });
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    delete process.env.CLOUDMERSIVE_API_KEY;
    uploadMock.mockResolvedValue({ error: null });
    signedUrlMock.mockResolvedValue({ data: { signedUrl: 'https://example.test/signed' }, error: null });
  });

  it('403 File Tampering when x-wife-content-hash does not match uploaded bytes', async () => {
    const file = fileFromBuffer(jpegBytes('actual-bytes'), 'doc.jpg', 'image/jpeg');
    const wrongHash = sha256Hex(jpegBytes('different-bytes'));
    const res = await uploadPost(buildUploadRequest(file, wrongHash));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('File Tampering Detected');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('400 when hash matches but polyglot JPEG+SVG fails magic-bytes gate', async () => {
    const polyglot = jpegBytes('<svg><script>alert(1)</script></svg>');
    const hash = sha256Hex(polyglot);
    const file = fileFromBuffer(polyglot, 'photo.jpg', 'image/jpeg');
    const res = await uploadPost(buildUploadRequest(file, hash));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('Invalid or malicious file');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('400 blocks image/svg+xml MIME before storage even with valid hash', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');
    const hash = sha256Hex(svg);
    const file = fileFromBuffer(svg, 'x.svg', 'image/svg+xml');
    const res = await uploadPost(buildUploadRequest(file, hash));
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('200 only when hash + magic bytes both pass (clean JPEG)', async () => {
    const clean = jpegBytes();
    const hash = sha256Hex(clean);
    const file = fileFromBuffer(clean, 'proof.jpg', 'image/jpeg');
    const res = await uploadPost(buildUploadRequest(file, hash));
    expect(res.status).toBe(200);
    expect(uploadMock).toHaveBeenCalled();
  });
});

describe('💥 UPLOAD WAVE 3 — PDF malware gate (real MalwareScanService in upload chain)', () => {
  beforeEach(async () => {
    (globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.CLOUDMERSIVE_API_KEY;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    uploadMock.mockResolvedValue({ error: null });
    signedUrlMock.mockResolvedValue({ data: { signedUrl: 'https://example.test/signed' }, error: null });

    const actual = await vi.importActual<typeof import('@/app/services/server/MalwareScanService.ts')>(
      '@/app/services/server/MalwareScanService.ts',
    );
    vi.mocked(scanBufferForMalware).mockImplementation(actual.scanBufferForMalware);
  });

  it('400 blocks PDF with /JavaScript after hash + magic-bytes pass (heuristic mode)', async () => {
    const malicious = pdfBytesWith('/OpenAction << /S /JavaScript /JS (app.alert("pwn")) >>');
    expect(validateFileBuffer(malicious, 'contract.pdf')).toBe(true);

    const hash = sha256Hex(malicious);
    const file = fileFromBuffer(malicious, 'contract.pdf', 'application/pdf');
    const res = await uploadPost(buildUploadRequest(file, hash));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string; reason?: string };
    expect(body.error).toContain('malware scan');
    expect(body.reason).toContain('Suspicious PDF');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('400 blocks PDF with /EmbeddedFile payload', async () => {
    const malicious = pdfBytesWith('1 0 obj << /Type /EmbeddedFile /EF << >> >> endobj');
    const hash = sha256Hex(malicious);
    const file = fileFromBuffer(malicious, 'bundle.pdf', 'application/pdf');
    const res = await uploadPost(buildUploadRequest(file, hash));
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('200 allows clean minimal PDF through full upload pipeline', async () => {
    const clean = pdfBytesWith('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
    const hash = sha256Hex(clean);
    const file = fileFromBuffer(clean, 'clean.pdf', 'application/pdf');
    const res = await uploadPost(buildUploadRequest(file, hash));
    expect(res.status).toBe(200);
    expect(uploadMock).toHaveBeenCalled();
  });

  it('400 when cloud scan flags file (CLOUDMERSIVE_API_KEY set)', async () => {
    process.env.CLOUDMERSIVE_API_KEY = 'drill-cloud-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ CleanResult: false }), { status: 200 })),
    );

    const clean = pdfBytesWith('1 0 obj << /Type /Catalog >> endobj');
    const hash = sha256Hex(clean);
    const file = fileFromBuffer(clean, 'cloud-flagged.pdf', 'application/pdf');
    const res = await uploadPost(buildUploadRequest(file, hash));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { reason?: string };
    expect(body.reason).toContain('Cloud malware scan flagged');
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
