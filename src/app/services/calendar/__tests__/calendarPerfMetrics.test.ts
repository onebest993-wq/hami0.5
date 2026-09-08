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
        if (typeof performance !== 'undefined') {
            try { performance.clearMarks(); } catch { /* ignore */ }
            try { performance.clearMeasures(); } catch { /* ignore */ }
        }
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        let t = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => t);
        vi.spyOn(performance, 'mark').mockImplementation((name: string): PerformanceMark => {
            performance.getEntriesByName(name, 'mark');
            t += name.includes('interactive') ? 250 : 0;
            return undefined as unknown as PerformanceMark;
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

    it('يرجع null إذا لم يكن هناك سوى start mark وعدم وجود interactive end mark', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:calendar:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:calendar:interactive') {
                return [] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getCalendarOpenToInteractiveMs()).toBeNull();
    });

    it('يرجع null إذا كان زمن interactive قبل زمن البداية (دلتا سلبية)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:calendar:open-request') {
                return [{ startTime: 2000 }] as PerformanceEntryList;
            }
            if (name === 'hami:calendar:interactive') {
                return [{ startTime: 1500 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getCalendarOpenToInteractiveMs()).toBeNull();
    });

    it('يرجع null بشكل آمن إذا عاد getEntriesByName مصفوفة فارغة رغم وجود performance API', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation(() => [] as PerformanceEntryList);
        markCalendarPerfPhase('open-request');
        markCalendarPerfPhase('interactive');
        expect(getCalendarOpenToInteractiveMs()).toBeNull();
    });

    it('يرجع null إذا كان performance API غير موجود في البيئة', () => {
        const origPerf = (globalThis as unknown as Record<string, unknown>).performance;
        try {
            (globalThis as unknown as Record<string, unknown>).performance = undefined as unknown as Performance;
            expect(getCalendarOpenToInteractiveMs()).toBeNull();
        } finally {
            (globalThis as unknown as Record<string, unknown>).performance = origPerf;
        }
    });

    it('يستخدم آخر marks عند تعدد الفتحات داخل الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:calendar:open-request') {
                return [{ startTime: 1000 }, { startTime: 2000 }] as PerformanceEntryList;
            }
            if (name === 'hami:calendar:interactive') {
                return [{ startTime: 1250 }, { startTime: 2365 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getCalendarOpenToInteractiveMs()).toBe(365);
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
