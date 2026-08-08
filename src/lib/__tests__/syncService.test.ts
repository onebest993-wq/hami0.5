import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn();
const selectEq = vi.fn();
const maybeSingle = vi.fn();

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
        from: vi.fn(() => ({
            upsert: (...args: unknown[]) => {
                upsert(...args);
                return {
                    select: () => ({
                        single: async () => ({
                            data: {
                                user_key: 'user-uuid-1',
                                app_data: {},
                                updated_at: '2026-01-01',
                            },
                            error: null,
                        }),
                    }),
                };
            },
            select: (...args: unknown[]) => {
                selectEq(...args);
                return {
                    eq: () => ({
                        maybeSingle,
                    }),
                };
            },
        })),
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

    it('saveToCloud يحفظ بمفتاح المستخدم الحقيقي', async () => {
        const { saveToCloud } = await import('@/lib/syncService.js');
        await saveToCloud({ lawyer_settings: { version: 2 } });

        expect(upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_key: 'user-uuid-1',
                app_data: { lawyer_settings: { version: 2 } },
            }),
            { onConflict: 'user_key' },
        );
    });

    it('loadFromCloud يجلب بيانات المستخدم الحالي', async () => {
        maybeSingle.mockResolvedValueOnce({
            data: { app_data: { lawyer_settings: { version: 2 } }, updated_at: '2026-01-01' },
            error: null,
        });

        const { loadFromCloud } = await import('@/lib/syncService.js');
        const data = await loadFromCloud();

        expect(selectEq).toHaveBeenCalledWith('app_data, updated_at');
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
    });
});
