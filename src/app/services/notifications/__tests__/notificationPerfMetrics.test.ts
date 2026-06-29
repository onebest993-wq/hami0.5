import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    clearNotificationPerfMarks,
    getNotificationsOpenToInteractiveMs,
    markNotificationPerfPhase,
    reportNotificationPerf,
} from '@/app/services/notifications/notificationPerfMetrics';

vi.mock('@/app/services/notifications/notificationSentryReporting', () => ({
    reportNotificationsOpenToSentry: vi.fn(),
}));

import { reportNotificationsOpenToSentry } from '@/app/services/notifications/notificationSentryReporting';

describe('notificationPerfMetrics', () => {
    afterEach(() => {
        clearNotificationPerfMarks();
        vi.restoreAllMocks();
    });

    it('يقيس open-request → interactive', () => {
        markNotificationPerfPhase('open-request');
        markNotificationPerfPhase('interactive');
        expect(getNotificationsOpenToInteractiveMs()).toBeGreaterThanOrEqual(0);
    });

    it('reportNotificationPerf يستدعي Sentry reporter', () => {
        vi.mocked(reportNotificationsOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:notifications:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:notifications:interactive') {
                return [{ startTime: 1500 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportNotificationPerf({ hadLocalCache: true, hadChunkCached: false });

        expect(reportNotificationsOpenToSentry).toHaveBeenCalledWith(500, {
            hadLocalCache: true,
            hadChunkCached: false,
        });
    });
});
