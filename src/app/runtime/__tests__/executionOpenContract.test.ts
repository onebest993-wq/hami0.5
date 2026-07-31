import { describe, expect, it, vi, beforeEach } from 'vitest';

const dashboardMocks = vi.hoisted(() => ({
    isExecutionDossierFirstPaintReady: vi.fn(() => false),
    getCachedExecutionDashboard: vi.fn(() => null),
    loadExecutionDashboardModule: vi.fn(() => Promise.resolve({})),
}));

const warmMocks = vi.hoisted(() => ({
    warmExecutionDossier: vi.fn(),
    warmExecutionDossierUntilReady: vi.fn(
        () =>
            new Promise<void>(() => {
                /* never resolves — commit لا ينتظر */
            }),
    ),
}));

const creationMocks = vi.hoisted(() => ({
    ensureExecutionCreationSurfaceReady: vi.fn(
        () =>
            new Promise<void>(() => {
                /* never resolves */
            }),
    ),
    isExecutionCreationSurfaceReady: vi.fn(() => false),
    prefetchExecutionCreationSurface: vi.fn(),
}));

vi.mock('@/app/runtime/executionDashboardLoader', () => dashboardMocks);
vi.mock('@/app/runtime/executionWorkspaceWarm', () => warmMocks);
vi.mock('@/app/runtime/executionCreationLoader', () => creationMocks);

import {
    openExecutionCreationWithContract,
    openExecutionDossierWithContract,
    prepareExecutionCreationOpen,
    prepareExecutionDossierOpen,
} from '../executionOpenContract';

describe('executionOpenContract — commit-first', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dashboardMocks.isExecutionDossierFirstPaintReady.mockReturnValue(false);
        dashboardMocks.getCachedExecutionDashboard.mockReturnValue(null);
        creationMocks.isExecutionCreationSurfaceReady.mockReturnValue(false);
    });

    it('prepareExecutionDossierOpen يطلق التسخين بلا انتظار', async () => {
        prepareExecutionDossierOpen('urgent');
        await vi.waitFor(() => {
            expect(warmMocks.warmExecutionDossier).toHaveBeenCalledWith('urgent');
            expect(warmMocks.warmExecutionDossierUntilReady).toHaveBeenCalledWith('urgent');
            expect(dashboardMocks.loadExecutionDashboardModule).toHaveBeenCalled();
        });
    });

    it('openExecutionDossierWithContract ينفّذ commit فوراً حتى لو علق التسخين', async () => {
        const commit = vi.fn();
        openExecutionDossierWithContract(commit, 'urgent');
        expect(commit).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(warmMocks.warmExecutionDossier).toHaveBeenCalledWith('urgent');
        });
    });

    it('prepareExecutionCreationOpen يطلق prefetch بلا انتظار', async () => {
        prepareExecutionCreationOpen();
        await vi.waitFor(() => {
            expect(creationMocks.prefetchExecutionCreationSurface).toHaveBeenCalled();
            expect(creationMocks.ensureExecutionCreationSurfaceReady).toHaveBeenCalled();
        });
    });

    it('openExecutionCreationWithContract ينفّذ commit فوراً', async () => {
        const commit = vi.fn();
        openExecutionCreationWithContract(commit);
        expect(commit).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(creationMocks.prefetchExecutionCreationSurface).toHaveBeenCalled();
        });
    });

    it('يتخطى التسخين إن كان الكاش جاهزاً', async () => {
        dashboardMocks.isExecutionDossierFirstPaintReady.mockReturnValue(true);
        dashboardMocks.getCachedExecutionDashboard.mockReturnValue((() => null) as never);
        prepareExecutionDossierOpen('urgent');
        await Promise.resolve();
        await Promise.resolve();
        expect(warmMocks.warmExecutionDossierUntilReady).not.toHaveBeenCalled();
    });
});
