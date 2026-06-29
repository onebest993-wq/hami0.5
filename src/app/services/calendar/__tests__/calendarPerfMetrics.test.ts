import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearCalendarPerfMarks,
    getCalendarOpenToInteractiveMs,
    markCalendarPerfPhase,
    reportCalendarPerf,
} from '@/app/services/calendar/calendarPerfMetrics';

vi.mock('@/app/services/calendar/calendarSentryReporting', () => ({
    reportCalendarOpenToSentry: vi.fn(),
}));

import { reportCalendarOpenToSentry } from '@/app/services/calendar/calendarSentryReporting';

describe('calendarPerfMetrics', () => {
    beforeEach(() => {
        clearCalendarPerfMarks();
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        let t = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => t);
        vi.spyOn(performance, 'mark').mockImplementation((name: string) => {
            performance.getEntriesByName(name, 'mark');
            t += name.includes('interactive') ? 250 : 0;
        });
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:calendar:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:calendar:interactive') {
                return [{ startTime: 1250 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        markCalendarPerfPhase('open-request');
        markCalendarPerfPhase('interactive');

        expect(getCalendarOpenToInteractiveMs()).toBe(250);
    });

    it('يرجع null بدون marks', () => {
        expect(getCalendarOpenToInteractiveMs()).toBeNull();
    });

    it('reportCalendarPerf يستدعي Sentry reporter', () => {
        vi.mocked(reportCalendarOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:calendar:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:calendar:interactive') {
                return [{ startTime: 1300 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportCalendarPerf({ eventCount: 2, hadLocalCache: false });

        expect(reportCalendarOpenToSentry).toHaveBeenCalledWith(300, {
            eventCount: 2,
            hadLocalCache: false,
        });
    });
});
