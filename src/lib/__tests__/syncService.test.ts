import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

vi.mock('@/lib/supabaseClient.js', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(async () => ({
                data: {
                    session: {
                        user: { id: 'user-uuid-1' },
                        access_token: 'real-access-token',
                    },
                },
            })),
        },
    },
}));

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: vi.fn(() => ({ user: null, session: null })),
    isDevMockAccessToken: vi.fn(() => false),
}));

vi.mock('@/app/utils/guestLawyerSession', () => ({
    GUEST_LAWYER_ID: 'guest-lawyer-1',
}));

describe('syncService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('saveToCloud يمر عبر BFF بمفتاح المستخدم الحقيقي', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            user_key: 'user-uuid-1',
            app_data: { lawyer_settings: { version: 2 } },
        });

        const { saveToCloud } = await import('@/lib/syncService.js');
        await saveToCloud({ lawyer_settings: { version: 2 } });

        expect(fetchSecure).toHaveBeenCalledWith('/api/settings/cloud-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_data: { lawyer_settings: { version: 2 } } }),
        });
    });

    it('loadFromCloud يجلب عبر BFF', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            app_data: { lawyer_settings: { version: 2 } },
        });

        const { loadFromCloud } = await import('@/lib/syncService.js');
        const data = await loadFromCloud();

        expect(fetchSecure).toHaveBeenCalledWith('/api/settings/cloud-sync', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        expect(data).toEqual({ lawyer_settings: { version: 2 } });
    });

    it('saveToCloud يرفض بدون جلسة حقيقية', async () => {
        const { supabase } = await import('@/lib/supabaseClient.js');
        vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
            data: { session: null },
            error: null,
        });

        const { saveToCloud } = await import('@/lib/syncService.js');
        await expect(saveToCloud({ lawyer_settings: { version: 2 } })).rejects.toMatchObject({
            code: 'CLOUD_SYNC_AUTH_REQUIRED',
        });
        expect(fetchSecure).not.toHaveBeenCalled();
    });
});
