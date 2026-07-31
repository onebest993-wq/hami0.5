import { describe, expect, it, vi, beforeEach } from 'vitest';

const hubMocks = vi.hoisted(() => ({
    prefetchExecutionArchiveHubModule: vi.fn(),
}));
const creationMocks = vi.hoisted(() => ({
    prefetchExecutionCreationSurface: vi.fn(),
}));
const dashboardMocks = vi.hoisted(() => ({
    prefetchExecutionDashboardByMode: vi.fn(),
    ensureExecutionDossierFirstPaintReady: vi.fn(() => Promise.resolve()),
    primeExecutionDossierSurface: vi.fn(),
}));
const caseOverlaysMocks = vi.hoisted(() => ({
    prefetchArchivePortalForWorkspace: vi.fn(),
}));
const coordinatorMocks = vi.hoisted(() => ({
    markExecutionWorkspaceWarmed: vi.fn(),
    markExecutionDossierWarmed: vi.fn(),
}));

vi.mock('@/app/runtime/hubArchiveLoader', () => hubMocks);
vi.mock('@/app/runtime/executionCreationLoader', () => creationMocks);
vi.mock('@/app/runtime/executionDashboardLoader', () => dashboardMocks);
vi.mock('@/app/runtime/archivePortalBoot', () => caseOverlaysMocks);
vi.mock('@/app/services/executionWarmCoordinator', () => coordinatorMocks);
vi.mock('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry', () => ({}));

import {
    warmExecutionDossier,
    warmExecutionWorkspace,
} from '../executionWorkspaceWarm';

describe('executionWorkspaceWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يُسخّن الأرشيف فوراً ثم الإنشاء+الإضبارة عند secondaryDelayMs=0', () => {
        warmExecutionWorkspace({ secondaryDelayMs: 0 });

        expect(hubMocks.prefetchExecutionArchiveHubModule).toHaveBeenCalled();
        expect(caseOverlaysMocks.prefetchArchivePortalForWorkspace).toHaveBeenCalledWith('execution');
        expect(dashboardMocks.primeExecutionDossierSurface).toHaveBeenCalled();
        expect(creationMocks.prefetchExecutionCreationSurface).toHaveBeenCalled();
        expect(coordinatorMocks.markExecutionDossierWarmed).toHaveBeenCalled();
    });

    it('لا يسخّن الإنشاء ولا الإضبارة عند includeSecondary:false', () => {
        warmExecutionWorkspace({ includeSecondary: false });

        expect(hubMocks.prefetchExecutionArchiveHubModule).toHaveBeenCalled();
        expect(caseOverlaysMocks.prefetchArchivePortalForWorkspace).toHaveBeenCalledWith('execution');
        expect(creationMocks.prefetchExecutionCreationSurface).not.toHaveBeenCalled();
        expect(dashboardMocks.primeExecutionDossierSurface).not.toHaveBeenCalled();
    });

    it('urgent على الإضبارة يستدعي loader مباشرة', () => {
        warmExecutionDossier('urgent');

        expect(dashboardMocks.prefetchExecutionDashboardByMode).toHaveBeenCalledWith('urgent');
        expect(coordinatorMocks.markExecutionDossierWarmed).toHaveBeenCalled();
    });

    it('warmExecutionDossierUntilReady ينتظر ensure first-paint', async () => {
        dashboardMocks.ensureExecutionDossierFirstPaintReady.mockResolvedValue(undefined);
        const { warmExecutionDossierUntilReady } = await import('../executionWorkspaceWarm');
        await warmExecutionDossierUntilReady('urgent');
        expect(dashboardMocks.ensureExecutionDossierFirstPaintReady).toHaveBeenCalled();
        expect(dashboardMocks.prefetchExecutionDashboardByMode).toHaveBeenCalledWith('urgent');
    });
});
