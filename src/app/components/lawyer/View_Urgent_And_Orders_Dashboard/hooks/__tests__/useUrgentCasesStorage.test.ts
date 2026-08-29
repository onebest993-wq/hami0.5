import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { useUrgentCasesStorage } from '../useUrgentCasesStorage';

const USER_ID = 'urgent-storage-hook-user';

describe('useUrgentCasesStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        UrgentActionsDB.invalidateCache(USER_ID);
    });

    afterEach(() => {
        UrgentActionsDB.invalidateCache(USER_ID);
        localStorage.clear();
    });

    it('يعرض الطلبات من peek قبل اكتمال getState', async () => {
        localStorage.setItem(
            `hami:urgentActions:v1:${USER_ID}`,
            JSON.stringify({
                schemaVersion: 1,
                userId: USER_ID,
                updatedAt: new Date().toISOString(),
                cases: [{ id: 'u-peek', applicantName: 'من التخزين', type: 'urgent_action', status: 'safe' }],
            }),
        );

        const { result } = renderHook(() => useUrgentCasesStorage(USER_ID));

        expect(result.current.casesStorageReady).toBe(true);
        expect(result.current.cases.some((row) => row.id === 'u-peek')).toBe(true);

        await act(async () => {
            await Promise.resolve();
        });
        expect(result.current.cases.some((row) => row.id === 'u-peek')).toBe(true);
    });

    it('لا يفرّغ القائمة بعد التحميل المؤكد', async () => {
        await UrgentActionsDB.saveState(USER_ID, [
            { id: 'u-keep', applicantName: 'ثابت', type: 'urgent_action', status: 'safe' },
        ]);

        const { result } = renderHook(() => useUrgentCasesStorage(USER_ID));
        expect(result.current.cases.some((row) => row.id === 'u-keep')).toBe(true);

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.casesStorageReady).toBe(true);
        expect(result.current.cases.some((row) => row.id === 'u-keep')).toBe(true);
    });
});
