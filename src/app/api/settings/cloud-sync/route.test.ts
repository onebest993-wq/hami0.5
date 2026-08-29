import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireWifeUserMock,
  supabaseFromMock,
  supabaseSelectMock,
  supabaseUpsertMock,
  supabaseEqMock,
  supabaseMaybeSingleMock,
  supabaseSingleMock,
} = vi.hoisted(() => ({
  requireWifeUserMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  supabaseSelectMock: vi.fn(),
  supabaseUpsertMock: vi.fn(),
  supabaseEqMock: vi.fn(),
  supabaseMaybeSingleMock: vi.fn(),
  supabaseSingleMock: vi.fn(),
}));

vi.mock('@/app/api/security/bffAuth.ts', () => ({
  requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
  requireWifeCloudWrite: (...args: unknown[]) => requireWifeUserMock(...args),
  unwrapWifeUser: (r: unknown) => r,
}));

vi.mock('@/app/api/security/supabaseAdminClient.ts', () => ({
  getSupabaseAdminClient: () => ({
    from: supabaseFromMock,
  }),
}));

import { GET, POST, PATCH } from './route.ts';

const USER_UUID = '11111111-2222-4333-8444-555555555555';
const OTHER_UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function wifeUserOk(userId = USER_UUID) {
  return { ok: true, userId };
}

function jsonReq(method: string, body?: unknown): Request {
  return new Request('http://127.0.0.1/api/settings/cloud-sync', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('/api/settings/cloud-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    requireWifeUserMock.mockResolvedValue(wifeUserOk());
    supabaseFromMock.mockReturnValue({
      select: supabaseSelectMock,
      upsert: supabaseUpsertMock,
    });
  });

  it('GET returns empty app_data for non-UUID subject without querying Postgres', async () => {
    requireWifeUserMock.mockResolvedValue(wifeUserOk('guest-lawyer-1'));
    const res = await GET(jsonReq('GET'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { app_data?: unknown };
    expect(body.app_data).toBeNull();
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it('GET scopes read to authenticated user_key', async () => {
    supabaseSelectMock.mockReturnValue({
      eq: supabaseEqMock.mockReturnValue({
        maybeSingle: supabaseMaybeSingleMock.mockResolvedValue({
          data: { app_data: { lawyer_settings: { v: 1 } }, updated_at: '2026-01-01' },
          error: null,
        }),
      }),
    });
    const res = await GET(jsonReq('GET'));
    expect(res.status).toBe(200);
    expect(supabaseEqMock).toHaveBeenCalledWith('user_key', USER_UUID);
  });

  it('POST ignores forged user_key in body and writes auth subject', async () => {
    supabaseUpsertMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: supabaseSingleMock.mockResolvedValue({
          data: {
            user_key: USER_UUID,
            app_data: { lawyer_settings: { v: 2 } },
            updated_at: '2026-01-02',
          },
          error: null,
        }),
      }),
    });

    const res = await POST(
      jsonReq('POST', {
        user_key: OTHER_UUID,
        app_data: { lawyer_settings: { v: 2 } },
      }),
    );
    expect(res.status).toBe(200);
    expect(supabaseUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_key: USER_UUID }),
      { onConflict: 'user_key' },
    );
  });

  it('POST rejects non-UUID subject', async () => {
    requireWifeUserMock.mockResolvedValue(wifeUserOk('guest-lawyer-1'));
    const res = await POST(jsonReq('POST', { app_data: { lawyer_settings: { v: 1 } } }));
    expect(res.status).toBe(403);
    expect(supabaseUpsertMock).not.toHaveBeenCalled();
  });

  it('PATCH migrateLegacy copies dev_user only when current row missing', async () => {
    const eqMock = vi
      .fn()
      .mockReturnValueOnce({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { app_data: { lawyer_settings: { legacy: true } }, updated_at: '2025-12-01' },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
    supabaseSelectMock.mockReturnValue({ eq: eqMock });
    supabaseUpsertMock.mockResolvedValue({ error: null });

    const res = await PATCH(jsonReq('PATCH', { action: 'migrateLegacy' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { migrated?: boolean };
    expect(body.migrated).toBe(true);
    expect(supabaseUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_key: USER_UUID }),
      { onConflict: 'user_key' },
    );
  });
});
