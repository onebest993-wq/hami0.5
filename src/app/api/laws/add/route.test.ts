import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const insertMock = vi.fn();
const singleMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      insert: insertMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: singleMock,
        }),
      }),
    }),
  }),
}));

vi.mock('../../security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignature: vi.fn(),
  wifeForbiddenResponse: () => new Response(null, { status: 403 }),
  wifeUnauthorizedResponse: () => new Response(null, { status: 401 }),
}));

vi.mock('../../security/sanitizer.ts', () => ({
  sanitizePayload: (v: unknown) => v,
  isJsonObjectRecord: (v: unknown) => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
}));

vi.mock('../lawsAdminAuth.ts', () => ({
  requirePlatformAdmin: vi.fn(),
}));

vi.mock('../../security/roleResolver.ts', () => ({
  isPlatformAdminUserId: vi.fn(),
}));

import { POST } from './route';
import { requirePlatformAdmin } from '../lawsAdminAuth.ts';
import { EXECUTION_LAW_CANONICAL_NAME } from '@/app/constants/iraqiLawCatalog';

describe('laws add route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ ok: true, userId: 'admin-1' });
    singleMock.mockResolvedValue({
      data: { id: '1', law_name: EXECUTION_LAW_CANONICAL_NAME, article_number: '1' },
      error: null,
    });
  });

  it('rejects non-admin', async () => {
    vi.mocked(requirePlatformAdmin).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
    });
    const res = await POST(
      new Request('http://127.0.0.1/api/laws/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          law_name: EXECUTION_LAW_CANONICAL_NAME,
          article_number: '1',
          content: 'نص',
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('inserts article for platform admin', async () => {
    const res = await POST(
      new Request('http://127.0.0.1/api/laws/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          law_name: EXECUTION_LAW_CANONICAL_NAME,
          article_number: '1',
          content: 'نص المادة',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; record?: { id?: string } };
    expect(body.ok).toBe(true);
    expect(body.record?.id).toBe('1');
  });

  it('falls back to dev local store when service role is missing', async () => {
    const tmpDir = path.join(os.tmpdir(), `hami-add-route-${process.pid}`);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.DEV_LAWS_BUNDLE_DIR = tmpDir;
    await fs.rm(tmpDir, { recursive: true, force: true });

    const res = await POST(
      new Request('http://127.0.0.1/api/laws/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          law_name: EXECUTION_LAW_CANONICAL_NAME,
          article_number: '9',
          content: 'نص محلي',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; message?: string; record?: { id?: string } };
    expect(body.ok).toBe(true);
    expect(body.message).toContain('ملف الحزمة المحلية');
    expect(body.record?.id).toBeTruthy();

    delete process.env.DEV_LAWS_BUNDLE_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
