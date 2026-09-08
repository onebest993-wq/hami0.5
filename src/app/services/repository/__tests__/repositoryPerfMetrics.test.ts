import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearRepositoryPerfMarks,
    getRepositoryOpenToInteractiveMs,
    getRepositoryZoneSwitchDeltaMs,
    markRepositoryPerfPhase,
    reportRepositoryPerf,
} from '@/app/services/repository/repositoryPerfMetrics';

vi.mock('@/app/services/repository/repositorySentryReporting', () => ({
    reportRepositoryOpenToSentry: vi.fn(),
}));

import { reportRepositoryOpenToSentry } from '@/app/services/repository/repositorySentryReporting';

describe('repositoryPerfMetrics', () => {
    beforeEach(() => {
        clearRepositoryPerfMarks();
        if (typeof performance !== 'undefined' && typeof performance.clearMeasures === 'function') {
            performance.clearMeasures();
        }
        vi.restoreAllMocks();
    });

    it('يحسب ms من open-request إلى interactive', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:interactive') {
                return [{ startTime: 1380 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        markRepositoryPerfPhase('open-request');
        markRepositoryPerfPhase('interactive');

        expect(getRepositoryOpenToInteractiveMs()).toBe(380);
    });

    it('يرجع null بدون marks', () => {
        expect(getRepositoryOpenToInteractiveMs()).toBeNull();
    });

    it('يستخدم آخر marks عند تعدد الفتحات داخل الجلسة نفسها', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:open-request') {
                return [{ startTime: 1000 }, { startTime: 2000 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:interactive') {
                return [{ startTime: 1380 }, { startTime: 2485 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        expect(getRepositoryOpenToInteractiveMs()).toBe(485);
    });

    it('reportRepositoryPerf يستدعي Sentry reporter', () => {
        vi.mocked(reportRepositoryOpenToSentry).mockClear();
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:interactive') {
                return [{ startTime: 1450 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        reportRepositoryPerf({ vaultDocCount: 3, notesCount: 1, hadVaultCache: true });

        expect(reportRepositoryOpenToSentry).toHaveBeenCalledWith(450, {
            vaultDocCount: 3,
            notesCount: 1,
            hadVaultCache: true,
        });
    });

    it('يرجع null إذا كان interactive start mark فقط بدون interactive end', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:open-request') {
                return [{ startTime: 1000 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getRepositoryOpenToInteractiveMs()).toBeNull();
    });

    it('يرجع null إذا كان الفرق سالباً interactive قبل open-request', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:open-request') {
                return [{ startTime: 2000 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:interactive') {
                return [{ startTime: 1500 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getRepositoryOpenToInteractiveMs()).toBeNull();
    });

    it('يرجع null إذا كان getEntriesByName يرجع مصفوفة فارغة تماماً', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation(() => {
            return [] as PerformanceEntryList;
        });
        expect(getRepositoryOpenToInteractiveMs()).toBeNull();
        expect(getRepositoryZoneSwitchDeltaMs()).toBeNull();
    });

    it('يرجع null لـ zone-switch بدون zone marks على الإطلاق', () => {
        expect(getRepositoryZoneSwitchDeltaMs()).toBeNull();
    });

    it('يرجع null لـ zone-switch إذا كان الفرق سالباً zoneDone قبل zone-request', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:zone-request') {
                return [{ startTime: 3000 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:zone-switched') {
                return [{ startTime: 2800 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getRepositoryZoneSwitchDeltaMs()).toBeNull();
    });

    it('يحسب ms zone-switch delta صحيح مع آخر marks', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:zone-request') {
                return [{ startTime: 100 }, { startTime: 5000 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:zone-switched') {
                return [{ startTime: 200 }, { startTime: 5720 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getRepositoryZoneSwitchDeltaMs()).toBe(720);
    });
});
