import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    resetCalendarReconcileStateForTests,
    runSmartCalendarReconcileIfNeeded,
    shouldRunCalendarReconcile,
} from '@/app/services/calendar/calendarReconcileScheduler';

vi.mock('@/app/services/calendarDossierSync', () => ({
    cleanupCalendarForUser: vi.fn(async () => ({
        lawsuitAppointments: 0,
        lawsuitTasks: 0,
        lawsuitDeadlines: 0,
        executionAppointments: 0,
        executionTasks: 0,
        urgentHearings: 0,
        transactionSteps: 0,
        criminalTimeline: 0,
        criminalTrials: 0,
        threadingTasks: 0,
        globalNotes: 0,
        fieldTasks: 0,
        lawsuitLegacy: 0,
        discoveredDates: 0,
        prunedOrphans: 0,
        purgedInactive: 0,
    })),
}));

import { cleanupCalendarForUser } from '@/app/services/calendarDossierSync';

const USER = 'lawyer-reconcile-1';

describe('calendarReconcileScheduler', () => {
    beforeEach(() => {
        localStorage.clear();
        resetCalendarReconcileStateForTests();
        vi.clearAllMocks();
    });

    it('shouldRunCalendarReconcile = true في أول مرة', () => {
        expect(shouldRunCalendarReconcile(USER, 'fp-1')).toBe(true);
    });

    it('يتخطى reconcile إذا نفس fingerprint خلال 24 ساعة', async () => {
        const now = Date.now();
        await runSmartCalendarReconcileIfNeeded(USER, 'fp-1');
        expect(cleanupCalendarForUser).toHaveBeenCalledTimes(1);

        vi.mocked(cleanupCalendarForUser).mockClear();
        expect(shouldRunCalendarReconcile(USER, 'fp-1', now + 1_000)).toBe(false);
        await runSmartCalendarReconcileIfNeeded(USER, 'fp-1');
        expect(cleanupCalendarForUser).not.toHaveBeenCalled();
    });

    it('يعيد reconcile عند تغيّر fingerprint بعد cooldown', async () => {
        vi.useFakeTimers();
        try {
            vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
            await runSmartCalendarReconcileIfNeeded(USER, 'fp-1');
            vi.mocked(cleanupCalendarForUser).mockClear();

            vi.setSystemTime(new Date('2026-06-01T12:06:00Z'));
            await runSmartCalendarReconcileIfNeeded(USER, 'fp-2');
            expect(cleanupCalendarForUser).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
