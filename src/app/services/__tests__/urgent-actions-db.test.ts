/**
 * Regression: الطلبات المستعجلة — تخزين محلي بدون عاصفة kv-proxy (افتراضياً)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UrgentActionsDB } from '../urgent-actions-db';
import { SecureAPIClient } from '../SecureAPIClient';

vi.mock('../SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: vi.fn(),
    },
}));

const USER_ID = 'regression-test-user';

describe('UrgentActionsDB regression', () => {
    beforeEach(() => {
        localStorage.clear();
        UrgentActionsDB.invalidateCache(USER_ID);
        vi.mocked(SecureAPIClient.fetchSecure).mockClear();
    });

    it('isCloudEnabled is false unless VITE_URGENT_CLOUD_SYNC=true', () => {
        expect(UrgentActionsDB.isCloudEnabled()).toBe(false);
    });

    it('saveState and patchCase never call kv-proxy when cloud is off', async () => {
        await UrgentActionsDB.saveState(USER_ID, [
            { id: 'case-a', applicantName: 'أحمد', type: 'urgent_action' },
        ]);
        await UrgentActionsDB.patchCase(USER_ID, 'case-a', { court: 'محكمة' });
        await UrgentActionsDB.syncFromCloud(USER_ID);

        expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
    });

    it('persists cases in localStorage under hami:urgentActions key', async () => {
        const storageKey = `hami:urgentActions:v1:${USER_ID}`;
        await UrgentActionsDB.saveState(USER_ID, [{ id: 'case-b', applicantName: 'سارة' }]);
        const state = await UrgentActionsDB.getState(USER_ID);

        expect(state?.userId).toBe(USER_ID);
        expect(Array.isArray(state?.cases)).toBe(true);
        expect((state?.cases[0] as { id?: string })?.id).toBe('case-b');

        const raw = localStorage.getItem(storageKey);
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw!) as { userId?: string; cases?: unknown[] };
        expect(parsed.userId).toBe(USER_ID);
        expect(parsed.cases).toHaveLength(1);

        UrgentActionsDB.invalidateCache(USER_ID);
        const reloaded = await UrgentActionsDB.getState(USER_ID);
        expect((reloaded?.cases ?? []).length).toBe(1);
    });

    it('loads from localStorage when in-memory cache is cleared', async () => {
        const storageKey = `hami:urgentActions:v1:${USER_ID}`;
        localStorage.setItem(
            storageKey,
            JSON.stringify({
                schemaVersion: 1,
                userId: USER_ID,
                updatedAt: new Date().toISOString(),
                cases: [{ id: 'case-ls', applicantName: 'من التخزين المحلي' }],
            }),
        );
        UrgentActionsDB.invalidateCache(USER_ID);
        const state = await UrgentActionsDB.getState(USER_ID);
        expect((state?.cases ?? []).length).toBe(1);
        expect((state?.cases[0] as { id?: string })?.id).toBe('case-ls');
    });

    it('migrates dev-user storage to a real user id when target is empty', async () => {
        const devKey = 'hami:urgentActions:v1:dev-user-uuid-1';
        const realId = 'real-lawyer-uuid-99';
        const realKey = `hami:urgentActions:v1:${realId}`;
        localStorage.setItem(
            devKey,
            JSON.stringify({
                schemaVersion: 1,
                userId: 'dev-user-uuid-1',
                updatedAt: new Date().toISOString(),
                cases: [{ id: 'case-dev', applicantName: 'إضبارة قديمة' }],
            }),
        );
        UrgentActionsDB.invalidateCache(realId);
        const state = await UrgentActionsDB.getState(realId);
        expect((state?.cases ?? []).length).toBe(1);
        expect((state?.cases[0] as { id?: string })?.id).toBe('case-dev');
        expect(localStorage.getItem(realKey)).toBeTruthy();
    });

    it('patchCase merges fields without duplicating cases', async () => {
        await UrgentActionsDB.saveState(USER_ID, [
            { id: 'case-c', status: 'safe' },
            { id: 'case-d', status: 'safe' },
        ]);
        await UrgentActionsDB.patchCase(USER_ID, 'case-c', { status: 'completed' });

        const state = await UrgentActionsDB.getState(USER_ID);
        const cases = (state?.cases ?? []) as Array<{ id?: string; status?: string }>;
        expect(cases).toHaveLength(2);
        expect(cases.find((c) => c.id === 'case-c')?.status).toBe('completed');
        expect(cases.find((c) => c.id === 'case-d')?.status).toBe('safe');
    });
});
