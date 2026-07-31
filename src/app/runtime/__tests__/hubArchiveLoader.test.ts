import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    getCachedArchivePortal,
    getCachedExecutionFileGrid,
    getCachedExecutionSurface,
    getExecutionFileGridReady,
    getExecutionSurfaceReady,
    loadArchivePortalModule,
    loadExecutionArchiveHubModule,
    prefetchExecutionArchiveContent,
    resetHubArchiveModuleCacheForTests,
} from '@/app/runtime/hubArchiveLoader';

vi.mock('@/app/components/lawyer/ArchivePortal.tsx', () => ({
    ArchivePortal: () => null,
}));

vi.mock('@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface', () => ({
    ArchivePortalExecutionSurface: () => null,
}));

vi.mock('@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid', () => ({
    ExecutionArchiveFileGrid: () => null,
}));

describe('hubArchiveLoader', () => {
    beforeEach(() => {
        resetHubArchiveModuleCacheForTests();
        vi.clearAllMocks();
    });

    it('يخزّن ArchivePortal بعد أول تحميل', async () => {
        expect(getCachedArchivePortal()).toBeNull();
        await loadArchivePortalModule();
        expect(getCachedArchivePortal()).not.toBeNull();
    });

    it('loadExecutionArchiveHubModule يعيد Portal ويطلق تسخين السطح بالخلفية', async () => {
        expect(getCachedArchivePortal()).toBeNull();
        await loadExecutionArchiveHubModule();
        expect(getCachedArchivePortal()).not.toBeNull();
        await vi.waitFor(() => {
            expect(getExecutionSurfaceReady()).toBe(true);
            expect(getExecutionFileGridReady()).toBe(true);
        });
        expect(getCachedExecutionSurface()).not.toBeNull();
        expect(getCachedExecutionFileGrid()).not.toBeNull();
    });

    it('prefetchExecutionArchiveContent يعلّم جاهزية السطح والشبكة', async () => {
        prefetchExecutionArchiveContent();
        await vi.waitFor(() => {
            expect(getExecutionSurfaceReady()).toBe(true);
            expect(getExecutionFileGridReady()).toBe(true);
        });
    });
});
