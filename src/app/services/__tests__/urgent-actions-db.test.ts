/**
 * Regression: الطلبات المستعجلة — تخزين محلي بدون عاصفة kv-proxy (افتراضياً)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kvSetMock, kvGetMock } = vi.hoisted(() => ({
    kvSetMock: vi.fn(),
    kvGetMock: vi.fn(),
}));

vi.mock('@/app/services/cloud/lawyerCloudKv', () => ({
    lawyerCloudKv: {
        set: (...args: unknown[]) => kvSetMock(...args),
        get: (...args: unknown[]) => kvGetMock(...args),
    },
}));

vi.mock('../SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: vi.fn(),
    },
}));

import { UrgentActionsDB } from '../urgent-actions-db';
import { SecureAPIClient } from '../SecureAPIClient';
import SecureStoreService from '../SecureStoreService';

const USER_ID = 'regression-test-user';
const STORAGE_KEY = `hami:urgentActions:v1:${USER_ID}`;

describe('UrgentActionsDB regression', () => {
    beforeEach(async () => {
        localStorage.clear();
        UrgentActionsDB.invalidateCache(USER_ID);
        UrgentActionsDB.invalidateCache('real-lawyer-uuid-99');
        UrgentActionsDB.invalidateCache('dev-user-uuid-1');
        await SecureStoreService.deleteItem(STORAGE_KEY);
        await SecureStoreService.deleteItem('hami:urgentActions:v1:real-lawyer-uuid-99');
        await SecureStoreService.deleteItem('hami:urgentActions:v1:dev-user-uuid-1');
        vi.mocked(SecureAPIClient.fetchSecure).mockClear();
        kvSetMock.mockClear();
        kvGetMock.mockClear();
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
        expect(kvSetMock).not.toHaveBeenCalled();
        expect(kvGetMock).not.toHaveBeenCalled();
    });

    it('يحفظ الإضابير في SecureStore ويمحو مرآة localStorage', async () => {
        await UrgentActionsDB.saveState(USER_ID, [{ id: 'case-b', applicantName: 'سارة' }]);
        const state = await UrgentActionsDB.getState(USER_ID);

        expect(state?.userId).toBe(USER_ID);
        expect(Array.isArray(state?.cases)).toBe(true);
        expect((state?.cases[0] as { id?: string })?.id).toBe('case-b');

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        const parsed = JSON.parse(String(SecureStoreService.getItemSync(STORAGE_KEY))) as {
            userId?: string;
            cases?: unknown[];
        };
        expect(parsed.userId).toBe(USER_ID);
        expect(parsed.cases).toHaveLength(1);

        UrgentActionsDB.invalidateCache(USER_ID);
        const reloaded = await UrgentActionsDB.getState(USER_ID);
        expect((reloaded?.cases ?? []).length).toBe(1);
    });

    it('peekState يرحّل مرآة localStorage القديمة ثم يمحوها', () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                schemaVersion: 1,
                userId: USER_ID,
                updatedAt: new Date().toISOString(),
                cases: [{ id: 'case-peek', applicantName: 'فوري' }],
            }),
        );
        UrgentActionsDB.invalidateCache(USER_ID);
        const peeked = UrgentActionsDB.peekState(USER_ID);
        expect((peeked?.cases ?? []).length).toBe(1);
        expect((peeked?.cases[0] as { id?: string })?.id).toBe('case-peek');
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('يقرأ من SecureStore بعد مسح الذاكرة حتى إن بقيت مرآة قديمة', async () => {
        localStorage.setItem(
            STORAGE_KEY,
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
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('migrates dev-user storage to a real user id when target is empty (DEV only)', async () => {
        const realId = 'real-lawyer-uuid-99';
        const realKey = `hami:urgentActions:v1:${realId}`;
        const devKey = 'hami:urgentActions:v1:dev-user-uuid-1';
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
        expect(localStorage.getItem(realKey)).toBeNull();
        expect(JSON.parse(String(SecureStoreService.getItemSync(realKey))).cases).toHaveLength(1);
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
