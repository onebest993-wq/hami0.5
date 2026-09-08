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
        vi.spyOn(performance, 'mark').mockImplementation((): PerformanceMark => undefined as unknown as PerformanceMark);
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
        vi.spyOn(performance, 'mark').mockImplementation((): PerformanceMark => undefined as unknown as PerformanceMark);
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
            vi.spyOn(performance, 'mark').mockImplementation((): PerformanceMark => undefined as unknown as PerformanceMark);
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

    it('يرفض stale fallback عند تبديل الجلسات قبل 1.2s — آخر مستخدم فقط يُعلن', async () => {
        vi.useFakeTimers();
        try {
            const { reportRepositoryOpenToSentry } = await import(
                '@/app/services/repository/repositorySentryReporting'
            );
            const sentry = vi.mocked(reportRepositoryOpenToSentry);
            sentry.mockClear();

            markRepositoryPerfPhase('open-request');
            vi.spyOn(performance, 'mark').mockImplementation((): PerformanceMark => undefined as unknown as PerformanceMark);
            vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
                if (name === 'hami:repository:open-request') {
                    return [{ startTime: 0 }] as PerformanceEntryList;
                }
                if (name === 'hami:repository:interactive') {
                    return [{ startTime: 1_300 }] as PerformanceEntryList;
                }
                return [] as PerformanceEntryList;
            });

            const { rerender } = renderHook(
                ({ uid, vault, notes, open }) => useRepositoryLifecycle(uid, vault, notes, open),
                { initialProps: { uid: 'u-old', vault: 1, notes: 2, open: true } },
            );

            const afterOldOpen = sentry.mock.calls.length;
            expect(afterOldOpen).toBeGreaterThanOrEqual(1);
            sentry.mockClear();

            rerender({ uid: 'u-new', vault: 9, notes: 8, open: true });
            const afterNewOpen = sentry.mock.calls.length;
            expect(afterNewOpen).toBeGreaterThanOrEqual(1);

            const latestCall = sentry.mock.calls[sentry.mock.calls.length - 1]!;
            expect(latestCall[1]!.userId).toBe('u-new');
            expect(latestCall[1]!.vaultDocCount).toBe(9);
            expect(latestCall[1]!.notesCount).toBe(8);

            sentry.mockClear();
            vi.advanceTimersByTime(1_200);
            expect(sentry.mock.calls.length).toBe(0);
        } finally {
            vi.useRealTimers();
        }
    });
});
