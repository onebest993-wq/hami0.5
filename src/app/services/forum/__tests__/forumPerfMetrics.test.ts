import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearForumPerfMarks,
    getForumOpenToInteractiveMs,
    markForumPerfPhase,
    reportForumPerf,
} from '@/app/services/forum/forumPerfMetrics';

vi.mock('@/app/services/forum/forumSentryReporting', () => ({
    reportForumOpenToSentry: vi.fn(),
}));

import { reportForumOpenToSentry } from '@/app/services/forum/forumSentryReporting';

describe('forumPerfMetrics', () => {
    beforeEach(() => {
        clearForumPerfMarks();
        if (typeof performance !== 'undefined' && typeof performance.clearMarks === 'function') {
            performance.clearMarks();
        }
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:forum:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:forum:interactive') {
                return [{ startTime: 1520 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        markForumPerfPhase('open-request');
        markForumPerfPhase('interactive');

        expect(getForumOpenToInteractiveMs()).toBe(520);
    });

    it('يرجع null بدون marks', () => {
        expect(getForumOpenToInteractiveMs()).toBeNull();
    });

    it('Null Scenario 2 — only-start: يرجع null إذا كانت open-request فقط بدون interactive', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:forum:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getForumOpenToInteractiveMs()).toBeNull();
    });

    it('Null Scenario 3 — reversed-time: يرجع null إذا كانت interactive قبل open-request (زمن عكسي)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:forum:open-request') {
                return [{ startTime: 2000 }] as PerformanceEntryList;
            }
            if (name === 'hami:forum:interactive') {
                return [{ startTime: 1500 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getForumOpenToInteractiveMs()).toBeNull();
    });

    it('Null Scenario 4 — no-perf-api: يرجع null عندما تكون performance API غير متاحة تماماً', () => {
        const stub = vi
            .spyOn(globalThis, 'performance' as never, 'get')
            .mockReturnValue(undefined as never);
        try {
            expect(getForumOpenToInteractiveMs()).toBeNull();
        } finally {
            stub.mockRestore();
        }
    });

    it('Null Scenario 5 — no-getEntriesByName: يرجع null عندما لا يتوفر getEntriesByName', () => {
        const originalFn = performance.getEntriesByName;
        (performance as unknown as Record<string, unknown>).getEntriesByName = undefined;
        try {
            expect(getForumOpenToInteractiveMs()).toBeNull();
        } finally {
            (performance as unknown as Record<string, unknown>).getEntriesByName = originalFn;
        }
    });

    it('يستخدم آخر marks عند تعدد الفتحات داخل الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:forum:open-request') {
                return [{ startTime: 1000 }, { startTime: 2200 }] as PerformanceEntryList;
            }
            if (name === 'hami:forum:interactive') {
                return [{ startTime: 1520 }, { startTime: 2810 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getForumOpenToInteractiveMs()).toBe(610);
    });

    it('reportForumPerf يستدعي Sentry reporter', () => {
        vi.mocked(reportForumOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:forum:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:forum:interactive') {
                return [{ startTime: 1600 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportForumPerf({ postCount: 12, hadLocalCache: false });

        expect(reportForumOpenToSentry).toHaveBeenCalledWith(600, {
            postCount: 12,
            hadLocalCache: false,
        });
    });
});
