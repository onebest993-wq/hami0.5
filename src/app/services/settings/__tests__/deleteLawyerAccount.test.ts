import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();
const purgeLocal = vi.fn();
const resolveLiveUserId = vi.fn(() => 'user-1' as string | null);
const signOut = vi.fn();
const bffEnabled = vi.fn(() => false);
const bffLogout = vi.fn(async () => true);

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...args: unknown[]) => fetchSecure(...args) },
}));

vi.mock('@/app/services/settings/localOnlyGuard', () => ({
    runBypassingLocalOnlyForUrl: async <T,>(_url: string, fn: () => Promise<T>) => fn(),
}));

vi.mock('@/app/services/settings/applicationWipe', () => ({
    purgeLocalApplicationData: (...args: unknown[]) => purgeLocal(...args),
}));

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: { auth: { signOut: (...args: unknown[]) => signOut(...args) } },
}));

vi.mock('@/app/utils/bffAuthClient', () => ({
    isBffAuthEnabled: () => bffEnabled(),
    bffLogout: (...args: unknown[]) => bffLogout(...args),
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    resolveLiveAuthUserIdForStorage: () => resolveLiveUserId(),
}));

import {
    ACCOUNT_DELETE_CONFIRMATION,
    ACCOUNT_DELETE_URL,
    deleteLawyerAccount,
} from '@/app/services/settings/deleteLawyerAccount';

describe('deleteLawyerAccount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resolveLiveUserId.mockReturnValue('user-1');
        fetchSecure.mockResolvedValue({ ok: true, complete: true, authDeleted: true });
        purgeLocal.mockResolvedValue({ complete: true, failedStages: [] });
        signOut.mockResolvedValue({ error: null });
    });

    it('لا يمسح الجهاز إن رفض الخادم حذف الحساب', async () => {
        fetchSecure.mockResolvedValueOnce({ ok: false, complete: false, authDeleted: false });
        const reset = vi.fn();
        await expect(deleteLawyerAccount(reset)).rejects.toThrow('account_delete_incomplete');
        expect(purgeLocal).not.toHaveBeenCalled();
        expect(signOut).not.toHaveBeenCalled();
    });

    it('يمسح الجهاز وينهي الجلسة بعد حذف السحابة والهوية', async () => {
        const reset = vi.fn();
        const onLogout = vi.fn(async () => undefined);
        const result = await deleteLawyerAccount(reset, onLogout);
        expect(fetchSecure).toHaveBeenCalledWith(
            ACCOUNT_DELETE_URL,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    confirmation: ACCOUNT_DELETE_CONFIRMATION,
                    version: 1,
                }),
            }),
        );
        expect(purgeLocal).toHaveBeenCalledWith('user-1', reset);
        expect(onLogout).toHaveBeenCalledTimes(1);
        expect(onLogout).toHaveBeenCalledWith({ skipLocalPurge: true });
        expect(result.authDeleted).toBe(true);
        expect(result.localCompleted).toBe(true);
    });
});
