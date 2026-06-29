import { describe, expect, it } from 'vitest';
import { CALENDAR_PERF_BUDGET } from '@/app/services/calendar/calendarPerfBudget';

describe('calendarPerfBudget', () => {
    it('CI limits tighter than legacy defaults', () => {
        expect(CALENDAR_PERF_BUDGET.openToInteractiveMs.ciColdMax).toBeLessThanOrEqual(6_000);
        expect(CALENDAR_PERF_BUDGET.openToInteractiveMs.ciCachedMax).toBeLessThanOrEqual(3_000);
        expect(CALENDAR_PERF_BUDGET.openToInteractiveMs.target).toBeLessThan(
            CALENDAR_PERF_BUDGET.openToInteractiveMs.ciCachedMax,
        );
    });
});
