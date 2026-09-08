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

    it('يستخدم آخر marks عند تعدد الفتحات داخل الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:notifications:open-request') {
                return [{ startTime: 1000 }, { startTime: 2100 }] as PerformanceEntryList;
            }
            if (name === 'hami:notifications:interactive') {
                return [{ startTime: 1500 }, { startTime: 2680 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getNotificationsOpenToInteractiveMs()).toBe(580);
    });

    it('بدون علامات interactive على الإطلاق — يعيد null', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:notifications:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getNotificationsOpenToInteractiveMs()).toBeNull();
    });

    it('بعد clearNotificationPerfMarks — يعيد null', () => {
        markNotificationPerfPhase('open-request');
        markNotificationPerfPhase('interactive');
        clearNotificationPerfMarks();
        expect(getNotificationsOpenToInteractiveMs()).toBeNull();
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
