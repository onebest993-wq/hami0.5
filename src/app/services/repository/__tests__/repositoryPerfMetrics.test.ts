import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    clearRepositoryPerfMarks,
    getRepositoryOpenToInteractiveMs,
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
});
