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
