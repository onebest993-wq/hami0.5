import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRepositoryLifecycle } from '@/app/components/lawyer/SmartRepository/hooks/useRepositoryLifecycle';
import {
    clearRepositoryPerfMarks,
    getRepositoryOpenToInteractiveMs,
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';
import { setVaultDocsWarmCache, invalidateVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmCache';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

vi.mock('@/app/services/repository/repositorySentryReporting', () => ({
    reportRepositoryOpenToSentry: vi.fn(),
}));

const sampleDoc = (): SmartVaultDoc => ({
    id: 'd1',
    title: 'test',
    type: 'pdf',
    tags: [],
    authorId: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileSize: 100,
    fileName: 'a.pdf',
    mimeType: 'application/pdf',
    storagePath: 'p',
    signedUrl: null,
    isProcessing: false,
    boundDossierId: null,
});

describe('useRepositoryLifecycle', () => {
    beforeEach(() => {
        invalidateVaultDocsWarmCache();
        clearRepositoryPerfMarks();
    });

    it('يسجّل interactive فوراً عند الفتح', () => {
        markRepositoryPerfPhase('open-request');
        vi.spyOn(performance, 'mark').mockImplementation(() => undefined);
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:open-request') {
                return [{ startTime: 100 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:interactive') {
                return [{ startTime: 250 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        renderHook(() => useRepositoryLifecycle('u1', 0, 0, true));
        expect(getRepositoryOpenToInteractiveMs()).toBe(150);
    });

    it('يسجّل interactive مع كاش vault', () => {
        setVaultDocsWarmCache('u1', [sampleDoc()]);
        markRepositoryPerfPhase('open-request');
        vi.spyOn(performance, 'mark').mockImplementation(() => undefined);
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:repository:open-request') {
                return [{ startTime: 500 }] as PerformanceEntryList;
            }
            if (name === 'hami:repository:interactive') {
                return [{ startTime: 700 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });

        renderHook(() => useRepositoryLifecycle('u1', 1, 0, true));
        expect(getRepositoryOpenToInteractiveMs()).toBe(200);
    });

    it('R1: بعد التبليغ الفوري لا يُعاد report عند انتهاء احتياطي 1.2s', async () => {
        vi.useFakeTimers();
        try {
            const { reportRepositoryOpenToSentry } = await import(
                '@/app/services/repository/repositorySentryReporting'
            );
            const sentry = vi.mocked(reportRepositoryOpenToSentry);
            sentry.mockClear();

            markRepositoryPerfPhase('open-request');
            vi.spyOn(performance, 'mark').mockImplementation(() => undefined);
            vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
                if (name === 'hami:repository:open-request') {
                    return [{ startTime: 10 }] as PerformanceEntryList;
                }
                if (name === 'hami:repository:interactive') {
                    return [{ startTime: 40 }] as PerformanceEntryList;
                }
                return [] as PerformanceEntryList;
            });

            renderHook(() => useRepositoryLifecycle('u1', 0, 0, true));
            const afterReady = sentry.mock.calls.length;
            expect(afterReady).toBeGreaterThanOrEqual(1);

            vi.advanceTimersByTime(1_200);
            expect(sentry.mock.calls.length).toBe(afterReady);
        } finally {
            vi.useRealTimers();
        }
    });
});
