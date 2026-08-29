import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const caseOverlaysMocks = vi.hoisted(() => ({
    prefetchArchivePortalShell: vi.fn(),
}));
const eagerMocks = vi.hoisted(() => ({
    startExecutionFilesEagerHydrate: vi.fn(),
}));
const execWarmMocks = vi.hoisted(() => ({
    warmExecutionWorkspace: vi.fn(),
}));
const lawsuitWarmMocks = vi.hoisted(() => ({
    warmLawsuitWorkspace: vi.fn(),
}));
const hubMocks = vi.hoisted(() => ({
    loadExecutionArchiveHubModule: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/app/runtime/archivePortalBoot', () => caseOverlaysMocks);
vi.mock('@/app/runtime/executionFilesEagerHydrate', () => eagerMocks);
vi.mock('@/app/runtime/executionWorkspaceWarm', () => execWarmMocks);
vi.mock('@/app/runtime/lawsuitWorkspaceWarm', () => lawsuitWarmMocks);
vi.mock('@/app/runtime/hubArchiveLoader', () => hubMocks);

import { scheduleDashboardSurfaceWarmAfterInteractive } from '../dashboardSurfaceWarm';

describe('dashboardSurfaceWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يسخّن الفهرس فوراً ويؤجّل الأسطح الثقيلة', async () => {
        const handle = scheduleDashboardSurfaceWarmAfterInteractive('u-1');

        expect(caseOverlaysMocks.prefetchArchivePortalShell).toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(eagerMocks.startExecutionFilesEagerHydrate).toHaveBeenCalledWith('u-1');
        });
        expect(execWarmMocks.warmExecutionWorkspace).not.toHaveBeenCalled();

        // requestIdleCallback قد لا يوجد في jsdom — المسار البديل setTimeout 1200
        if (typeof requestIdleCallback === 'undefined') {
            await vi.advanceTimersByTimeAsync(1_200);
        } else {
            await vi.advanceTimersByTimeAsync(4_000);
        }

        await vi.waitFor(() => {
            expect(execWarmMocks.warmExecutionWorkspace).toHaveBeenCalled();
            expect(lawsuitWarmMocks.warmLawsuitWorkspace).toHaveBeenCalled();
        });

        handle.cancel();
    });
});
