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

    it('feedLoading=false عند وجود ملاحظات حتى أثناء تحميل vault', () => {
        const { result } = renderHook(() => useRepositoryLifecycle('u1', true, 0, 2));
        expect(result.current.feedLoading).toBe(false);
        expect(result.current.isShellReady).toBe(true);
    });

    it('feedLoading=false دائماً — القائمة لا تُحجب بانتظار vault', () => {
        const { result } = renderHook(() => useRepositoryLifecycle('u1', true, 0, 0));
        expect(result.current.feedLoading).toBe(false);
        expect(result.current.isShellReady).toBe(true);
    });

    it('يسجّل interactive حتى أثناء تحميل vault الفارغ', () => {
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

        renderHook(() => useRepositoryLifecycle('u1', true, 0, 0));
        expect(getRepositoryOpenToInteractiveMs()).toBe(150);
    });

    it('isShellReady فوراً مع كاش vault', () => {
        setVaultDocsWarmCache('u1', [sampleDoc()]);
        vi.spyOn(performance, 'getEntriesByName').mockReturnValue([] as PerformanceEntryList);

        const { result } = renderHook(() => useRepositoryLifecycle('u1', true, 0, 0));
        expect(result.current.isShellReady).toBe(true);
        expect(result.current.feedLoading).toBe(false);
    });

    it('يسجّل interactive عند shell ready', () => {
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

        renderHook(() => useRepositoryLifecycle('u1', false, 1, 0));
        expect(getRepositoryOpenToInteractiveMs()).toBe(200);
    });
});
