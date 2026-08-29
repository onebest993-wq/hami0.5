/**
 * WIFE Full-Application Destruction Drill — طبقة المسارات (BFF business logic).
 * يفترض اجتياز WIFE cryptographically ثم يختبر رفض التصعيد / عبور المستخدم / تسميم البيانات.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  kvGetMock,
  kvSetMock,
  kvDelMock,
  kvGetByPrefixMock,
  requirePlatformAdminMock,
  requireWifeUserMock,
  isAdminRequestMock,
  canManageForumAdminMock,
  supabaseFromMock,
  supabaseUpdateMock,
  supabaseEqMock,
  supabaseInsertMock,
  supabaseUpsertMock,
  supabaseSelectMock,
} = vi.hoisted(() => ({
  kvGetMock: vi.fn(),
  kvSetMock: vi.fn(),
  kvDelMock: vi.fn(),
  kvGetByPrefixMock: vi.fn(),
  requirePlatformAdminMock: vi.fn(),
  requireWifeUserMock: vi.fn(),
  isAdminRequestMock: vi.fn(),
  canManageForumAdminMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  supabaseUpdateMock: vi.fn(),
  supabaseEqMock: vi.fn(),
  supabaseInsertMock: vi.fn(),
  supabaseUpsertMock: vi.fn(),
  supabaseSelectMock: vi.fn(),
}));

vi.mock('@/app/api/security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(() => 'drill-token'),
  getVerifiedTokenSubject: vi.fn(async () => 'attacker-user-id'),
  isTokenAuthorized: vi.fn(async () => true),
  verifyWifeSignature: vi.fn(async () => true),
  enforceTokenActorBinding: vi.fn(async () => true),
  wifeForbiddenResponse: () => new Response(JSON.stringify({ ok: false }), { status: 403 }),
  wifeUnauthorizedResponse: () => new Response(JSON.stringify({ ok: false }), { status: 401 }),
}));

vi.mock('@/app/api/security/bffAuth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/api/security/bffAuth.ts')>();
  return {
    ...actual,
    requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
    requireWifeCloudWrite: (...args: unknown[]) => requireWifeUserMock(...args),
  };
});

vi.mock('@/app/api/security/kvStoreAdmin.ts', () => ({
  kvGet: (...args: unknown[]) => kvGetMock(...args),
  kvSet: (...args: unknown[]) => kvSetMock(...args),
  kvDel: (...args: unknown[]) => kvDelMock(...args),
  kvGetByPrefix: (...args: unknown[]) => kvGetByPrefixMock(...args),
  kvReadHqVerificationQueueByPrefix: vi.fn(async () => ({ rows: [], capped: false })),
}));

vi.mock('@/app/api/laws/lawsAdminAuth.ts', () => ({
  requirePlatformAdmin: (...args: unknown[]) => requirePlatformAdminMock(...args),
}));

vi.mock('@/app/api/security/adminCheck.ts', () => ({
  isAdminRequest: (...args: unknown[]) => isAdminRequestMock(...args),
}));

vi.mock('@/app/api/forum/adminAuth.ts', () => ({
  canManageForumAdmin: (...args: unknown[]) => canManageForumAdminMock(...args),
}));

vi.mock('@/app/api/security/supabaseAdminClient.ts', () => ({
  getSupabaseAdminClient: () => ({
    from: supabaseFromMock,
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: { from: () => ({ remove: vi.fn().mockResolvedValue({ error: null }) }) },
    from: supabaseFromMock,
  }),
}));

vi.mock('@/app/api/security/sanitizer.ts', () => ({
  sanitizePayload: (v: unknown) => v,
  isJsonObjectRecord: (v: unknown) => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
}));

import { POST as kvProxyPost } from '@/app/api/kv-proxy/route.ts';
import { POST as lawsListPost } from '@/app/api/laws/list/route.ts';
import { POST as lawsAddPost } from '@/app/api/laws/add/route.ts';
import { POST as lawsClearPost } from '@/app/api/laws/clear/route.ts';
import { POST as uploadRemovePost } from '@/app/api/upload/remove/route.ts';
import { POST as adminBanPost } from '@/app/api/admin/ban/route.ts';
import { POST as forumBanPost } from '@/app/api/forum/ban/route.ts';
import { GET as timelineGet, POST as timelinePost } from '@/app/api/timeline-events/route.ts';
import { GET as cloudSyncGet, POST as cloudSyncPost } from '@/app/api/settings/cloud-sync/route.ts';
import { POST as auditLogPost } from '@/app/api/audit/log/route.ts';
import { EXECUTION_LAW_CANONICAL_NAME } from '@/app/constants/iraqiLawCatalog';

const ATTACKER = 'attacker-user-id';
const ATTACKER_UUID = 'cccccccc-dddd-4eee-8fff-000000000001';
const VICTIM = 'victim-user-id';

function jsonReq(url: string, body: unknown, method = 'POST'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
}

function wifeUserOk(userId = ATTACKER): { ok: true; userId: string } {
  return { ok: true, userId };
}

function chainTimelineSelect(rows: unknown[] = []) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq2 = vi.fn().mockReturnValue({ order });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  supabaseSelectMock.mockReturnValue({ eq: eq1 });
  return { eq1, eq2, order };
}

describe('💥 ROUTE WAVE 1 — KV proxy execution vault raid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
  });

  it('403 on get victim lawyer_files key', async () => {
    const res = await kvProxyPost(
      jsonReq('http://127.0.0.1/api/kv-proxy', {
        action: 'get',
        key: `lawyer_files:${VICTIM}:exec-001`,
      }),
    );
    expect(res.status).toBe(403);
    expect(kvGetMock).not.toHaveBeenCalled();
  });

  it('403 on getByPrefix enumeration of all users', async () => {
    const res = await kvProxyPost(jsonReq('http://127.0.0.1/api/kv-proxy', { action: 'getByPrefix', prefix: 'user:' }));
    expect(res.status).toBe(403);
    expect(kvGetByPrefixMock).not.toHaveBeenCalled();
  });

  it('403 on del victim notification key', async () => {
    const res = await kvProxyPost(
      jsonReq('http://127.0.0.1/api/kv-proxy', { action: 'del', key: `notifications_${VICTIM}` }),
    );
    expect(res.status).toBe(403);
    expect(kvDelMock).not.toHaveBeenCalled();
  });

  it('403 on set community global poison key', async () => {
    const res = await kvProxyPost(
      jsonReq('http://127.0.0.1/api/kv-proxy', { action: 'set', key: 'community:posts:inject', value: { pwn: true } }),
    );
    expect(res.status).toBe(403);
    expect(kvSetMock).not.toHaveBeenCalled();
  });
});

describe('💥 ROUTE WAVE 2 — Legal search & catalog poisoning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
    requirePlatformAdminMock.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    supabaseFromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it('400 on laws/list with unknown law name (catalog injection)', async () => {
    const res = await lawsListPost(jsonReq('http://127.0.0.1/api/laws/list', { law_name: 'قانون_سري_غير_مسجل' }));
    expect(res.status).toBe(400);
  });

  it('403 on laws/add for non-platform-admin', async () => {
    const res = await lawsAddPost(
      jsonReq('http://127.0.0.1/api/laws/add', {
        law_name: EXECUTION_LAW_CANONICAL_NAME,
        article_number: '999',
        content: 'حقن',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('403 on laws/clear wipe attempt by lawyer', async () => {
    const res = await lawsClearPost(
      jsonReq('http://127.0.0.1/api/laws/clear', { law_name: EXECUTION_LAW_CANONICAL_NAME, confirm: true }),
    );
    expect(res.status).toBe(403);
  });
});

describe('💥 ROUTE WAVE 3 — Execution timeline isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER_UUID));
    supabaseFromMock.mockReturnValue({
      select: supabaseSelectMock,
      upsert: supabaseUpsertMock.mockResolvedValue({ error: null }),
    });
  });

  it('non-UUID subject GET returns empty rows without Postgres query', async () => {
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
    const res = await timelineGet(
      new Request('http://127.0.0.1/api/timeline-events?executionFileId=victim-exec-99', { method: 'GET' }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows?: unknown[] };
    expect(body.rows).toEqual([]);
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it('non-UUID subject POST is rejected (403)', async () => {
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
    const res = await timelinePost(
      jsonReq('http://127.0.0.1/api/timeline-events', {
        executionFileId: 'exec-1',
        event: { id: 'ev-1', title: 'inject' },
      }),
    );
    expect(res.status).toBe(403);
    expect(supabaseUpsertMock).not.toHaveBeenCalled();
  });

  it('scopes timeline GET to authenticated user_id only', async () => {
    const { eq1, eq2 } = chainTimelineSelect([]);
    const res = await timelineGet(
      new Request('http://127.0.0.1/api/timeline-events?executionFileId=victim-exec-99', { method: 'GET' }),
    );
    expect(res.status).toBe(200);
    expect(eq1).toHaveBeenCalledWith('execution_file_id', 'victim-exec-99');
    expect(eq2).toHaveBeenCalledWith('user_id', ATTACKER_UUID);
  });

  it('writes timeline POST with auth user_id not body impersonation', async () => {
    supabaseUpsertMock.mockResolvedValue({ error: null });
    const res = await timelinePost(
      jsonReq('http://127.0.0.1/api/timeline-events', {
        executionFileId: 'exec-1',
        user_id: VICTIM,
        event: { id: 'ev-1', title: 'inject' },
      }),
    );
    expect(res.status).toBe(200);
    expect(supabaseUpsertMock).toHaveBeenCalled();
    const row = supabaseUpsertMock.mock.calls[0]?.[0];
    expect(row?.user_id).toBe(ATTACKER_UUID);
    expect(row?.user_id).not.toBe(VICTIM);
    expect(supabaseUpsertMock.mock.calls[0]?.[1]).toEqual({
      onConflict: 'user_id,execution_file_id,event_id',
    });
  });
});

describe('💥 ROUTE WAVE 3b — Cloud sync ownership (WIFE-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER_UUID));
    supabaseUpsertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { user_key: ATTACKER_UUID, app_data: { probe: true }, updated_at: '2026-01-01' },
          error: null,
        }),
      }),
    });
    supabaseFromMock.mockReturnValue({
      select: supabaseSelectMock,
      upsert: supabaseUpsertMock,
    });
  });

  it('POST ignores forged user_key in body', async () => {
    const res = await cloudSyncPost(
      jsonReq('http://127.0.0.1/api/settings/cloud-sync', {
        user_key: VICTIM,
        app_data: { lawyer_settings: { stolen: true } },
      }),
    );
    expect(res.status).toBe(200);
    expect(supabaseUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_key: ATTACKER_UUID }),
      { onConflict: 'user_key' },
    );
  });

  it('403 non-UUID guest POST cloud-sync', async () => {
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
    const res = await cloudSyncPost(
      jsonReq('http://127.0.0.1/api/settings/cloud-sync', { app_data: { lawyer_settings: {} } }),
    );
    expect(res.status).toBe(403);
    expect(supabaseUpsertMock).not.toHaveBeenCalled();
  });

  it('GET non-UUID returns null app_data without Postgres', async () => {
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
    const res = await cloudSyncGet(
      new Request('http://127.0.0.1/api/settings/cloud-sync', { method: 'GET' }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { app_data?: unknown };
    expect(body.app_data).toBeNull();
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });
});

describe('💥 ROUTE WAVE 4 — Storage path hijack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('403 on upload/remove victim vault path', async () => {
    const res = await uploadRemovePost(
      jsonReq('http://127.0.0.1/api/upload/remove', {
        paths: [`${VICTIM}/vault/confidential.pdf`, '../etc/passwd'],
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('💥 ROUTE WAVE 5 — Admin & forum moderation escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
    isAdminRequestMock.mockResolvedValue(false);
    canManageForumAdminMock.mockResolvedValue(false);
    supabaseUpdateMock.mockReturnValue({ eq: supabaseEqMock.mockResolvedValue({ error: null }) });
    supabaseFromMock.mockReturnValue({
      update: supabaseUpdateMock,
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    });
  });

  it('403 admin/ban when requesterId spoofed to admin uuid', async () => {
    const res = await adminBanPost(
      jsonReq('http://127.0.0.1/api/admin/ban', {
        requesterId: 'fake-admin-from-metadata',
        targetUserId: VICTIM,
        updates: { is_banned: true },
      }),
    );
    expect(res.status).toBe(403);
    expect(supabaseUpdateMock).not.toHaveBeenCalled();
  });

  it('403 admin/ban when isAdminRequest false (metadata SUPER_ADMIN ignored)', async () => {
    const res = await adminBanPost(
      jsonReq('http://127.0.0.1/api/admin/ban', {
        requesterId: ATTACKER,
        targetUserId: VICTIM,
        updates: { is_banned: true },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('403 forum/ban mass-ban without moderator role', async () => {
    const res = await forumBanPost(
      jsonReq('http://127.0.0.1/api/forum/ban', {
        action: 'ban',
        userId: VICTIM,
        userName: 'Victim',
        reason: 'mass ban attack',
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('💥 ROUTE WAVE 6 — Audit spam & request impersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue(wifeUserOk(ATTACKER));
    supabaseInsertMock.mockResolvedValue({ error: null });
    supabaseFromMock.mockReturnValue({ insert: supabaseInsertMock });
  });

  it('audit log binds user_id to auth subject not payload', async () => {
    const res = await auditLogPost(
      jsonReq('http://127.0.0.1/api/audit/log', {
        action: 'login_success',
        user_id: VICTIM,
        details: { forged: true },
      }),
    );
    expect(res.status).toBe(200);
    expect(supabaseInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: ATTACKER, action: 'login_success' }),
    );
  });

  it('rejects client-forged privilege audit actions', async () => {
    const res = await auditLogPost(
      jsonReq('http://127.0.0.1/api/audit/log', {
        action: 'ADMIN_PURGE_ALL',
        user_id: VICTIM,
        details: { forged: true },
      }),
    );
    expect(res.status).toBe(400);
    expect(supabaseInsertMock).not.toHaveBeenCalled();
  });

  it('rejects client-forged headquarters audit prefix', async () => {
    const res = await auditLogPost(
      jsonReq('http://127.0.0.1/api/audit/log', {
        action: 'hq:user.freeze',
        details: { forged: true },
      }),
    );
    expect(res.status).toBe(403);
    expect(supabaseInsertMock).not.toHaveBeenCalled();
  });
});
