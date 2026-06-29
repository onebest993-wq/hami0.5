import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearProfilePerfMarks,
    getProfileOpenToInteractiveMs,
    markProfilePerfPhase,
    reportProfilePerf,
} from '@/app/services/profile/profilePerfMetrics';

vi.mock('@/app/services/profile/profileSentryReporting', () => ({
    reportProfileOpenToSentry: vi.fn(),
}));

import { reportProfileOpenToSentry } from '@/app/services/profile/profileSentryReporting';

describe('profilePerfMetrics', () => {
    beforeEach(() => {
        clearProfilePerfMarks();
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:profile:open-request') {
                return [{ startTime: 500 }] as PerformanceEntryList;
            }
            if (name === 'hami:profile:interactive') {
                return [{ startTime: 900 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getProfileOpenToInteractiveMs()).toBe(400);
    });

    it('يستخدم أحدث mark عند تكرار open-request', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:profile:open-request') {
                return [{ startTime: 100 }, { startTime: 800 }] as PerformanceEntryList;
            }
            if (name === 'hami:profile:interactive') {
                return [{ startTime: 200 }, { startTime: 950 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getProfileOpenToInteractiveMs()).toBe(150);
    });

    it('reportProfilePerf يستدعي Sentry reporter', () => {
        vi.mocked(reportProfileOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:profile:open-request') {
                return [{ startTime: 100 }] as PerformanceEntryList;
            }
            if (name === 'hami:profile:interactive') {
                return [{ startTime: 450 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportProfilePerf({ hadWarmCache: true, isOwnProfile: true });

        expect(reportProfileOpenToSentry).toHaveBeenCalledWith(350, {
            hadWarmCache: true,
            isOwnProfile: true,
        });
    });

    it('markProfilePerfPhase لا يرمي', () => {
        expect(() => markProfilePerfPhase('open-request')).not.toThrow();
    });
});
