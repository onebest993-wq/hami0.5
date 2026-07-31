import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearHomeHubPerfMarks,
    getHomeHubOpenToInteractiveMs,
    markHomeHubPerfPhase,
    reportHomeHubPerf,
} from '@/app/services/alerts/homeHubPerfMetrics';

vi.mock('@/app/services/alerts/homeHubSentryReporting', () => ({
    reportHomeHubOpenToSentry: vi.fn(),
}));

import { reportHomeHubOpenToSentry } from '@/app/services/alerts/homeHubSentryReporting';

describe('homeHubPerfMetrics', () => {
    beforeEach(() => {
        clearHomeHubPerfMarks();
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 1400 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        markHomeHubPerfPhase('open-request');
        markHomeHubPerfPhase('interactive');

        expect(getHomeHubOpenToInteractiveMs()).toBe(400);
    });

    it('يرجع null بدون marks', () => {
        expect(getHomeHubOpenToInteractiveMs()).toBeNull();
    });

    it('يرجع null عندما interactive قبل open-request', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 1400 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getHomeHubOpenToInteractiveMs()).toBeNull();
    });

    it('reportHomeHubPerf لا يرمي بدون marks', () => {
        expect(() => reportHomeHubPerf({ alertsTabCount: 1 })).not.toThrow();
    });

    it('reportHomeHubPerf يستدعي Sentry reporter', () => {
        vi.mocked(reportHomeHubOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:home-hub:open-request') {
                return [{ startTime: 200 }] as PerformanceEntryList;
            }
            if (name === 'hami:home-hub:interactive') {
                return [{ startTime: 550 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportHomeHubPerf({ alertsTabCount: 2, hadRadarCache: true });

        expect(reportHomeHubOpenToSentry).toHaveBeenCalledWith(350, {
            alertsTabCount: 2,
            hadRadarCache: true,
        });
    });
});
