import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const populate = vi.hoisted(() => vi.fn());

vi.mock('@/app/services/calendarDossierSync', () => ({
    ensureCalendarPopulatedFromLiveDossiers: (...args: unknown[]) => populate(...args),
}));

import {
    bumpThreadingCalendarSync,
    resetIncrementalCalendarSyncForTests,
} from '@/app/hooks/useIncrementalCalendarSync';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import {
    markDossierSyncFingerprint,
    resetDossierSyncStateForTests,
    shouldSkipDossierSyncForFingerprint,
} from '@/app/services/calendar/calendarDossierSyncState';

async function flushDebouncedSync(): Promise<void> {
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();
}

describe('bumpThreadingCalendarSync', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetDossierSyncStateForTests();
        resetIncrementalCalendarSyncForTests();
        populate.mockReset();
        populate.mockResolvedValue(true);
    });

    afterEach(() => {
        resetIncrementalCalendarSyncForTests();
        vi.useRealTimers();
    });

    it('يُسقط التخطّي فيحفظ ثانٍ لمعاملة يُعاد مزامنته', async () => {
        const emptyFp = buildCalendarDossierFingerprint();
        markDossierSyncFingerprint('lawyer-1', emptyFp);

        bumpThreadingCalendarSync('lawyer-1');
        await flushDebouncedSync();
        expect(populate).toHaveBeenCalledTimes(1);

        populate.mockClear();
        bumpThreadingCalendarSync('lawyer-1');
        await flushDebouncedSync();
        expect(populate).toHaveBeenCalledTimes(1);
    });

    it('لا يعلّم البصمة نجاحاً إذا فشلت مزامنة Threading', async () => {
        populate.mockResolvedValue(false);
        const fp = buildCalendarDossierFingerprint();
        bumpThreadingCalendarSync('lawyer-1');
        await flushDebouncedSync();
        expect(populate).toHaveBeenCalledTimes(1);
        expect(shouldSkipDossierSyncForFingerprint('lawyer-1', fp)).toBe(false);
    });
});
