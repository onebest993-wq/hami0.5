import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runExecutionFollowupOverlayPrefetch } from '../executionFollowupOverlayPrefetchRuntime';

const {
    isLitePerformanceActiveMock,
    prefetchExecutionDashboardShellMock,
    prefetchFollowupMemoPanelsMock,
    prefetchExecutionFollowupDefaultTabMock,
    prefetchExecutionFollowupModalPortalMock,
    prefetchExecutionFollowupModalHostMock,
    primeFollowupModalSnapshotBuilderMock,
} = vi.hoisted(() => ({
    isLitePerformanceActiveMock: vi.fn(() => false),
    prefetchExecutionDashboardShellMock: vi.fn(),
    prefetchFollowupMemoPanelsMock: vi.fn(),
    prefetchExecutionFollowupDefaultTabMock: vi.fn(),
    prefetchExecutionFollowupModalPortalMock: vi.fn(),
    prefetchExecutionFollowupModalHostMock: vi.fn(),
    primeFollowupModalSnapshotBuilderMock: vi.fn(),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => isLitePerformanceActiveMock(),
}));

vi.mock('../executionDashboardLazyRegistryShell', () => ({
    prefetchExecutionDashboardShell: () => prefetchExecutionDashboardShellMock(),
}));

vi.mock('../executionDashboardFollowupTabLazy', () => ({
    prefetchFollowupMemoPanels: () => prefetchFollowupMemoPanelsMock(),
    LazyCoerciveTab: () => null,
    LazyPersonalTab: () => null,
    LazyFinancialTab: () => null,
    LazyOtherPartyTab: () => null,
    LazySeizureRequestsTab: () => null,
    LazyCommunicationsTab: () => null,
    LazyRequestsTab: () => null,
    LazyDossierControlsTab: () => null,
}));

vi.mock('../executionFollowupModalLazy', () => ({
    prefetchExecutionFollowupModalPortal: () => prefetchExecutionFollowupModalPortalMock(),
}));

vi.mock('../executionFollowupHostLazy', () => ({
    prefetchExecutionFollowupModalHost: () => prefetchExecutionFollowupModalHostMock(),
}));

vi.mock('../executionFollowupTabPrefetch', () => ({
    prefetchExecutionFollowupDefaultTab: () => prefetchExecutionFollowupDefaultTabMock(),
}));

vi.mock('../hooks/buildFollowupModalSnapshotInput', () => ({
    buildFollowupModalSnapshotInput: (sources: Record<string, unknown>) => sources,
}));

vi.mock('../hooks/followupModalSnapshotBuilderCache', () => ({
    primeFollowupModalSnapshotBuilder: (builder: unknown) => primeFollowupModalSnapshotBuilderMock(builder),
}));

describe('executionFollowupOverlayPrefetchRuntime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLitePerformanceActiveMock.mockReturnValue(false);
    });

    it('يسجّل بنّاء الكيس ويسخّن البوابة والتبويب الافتراضي', async () => {
        runExecutionFollowupOverlayPrefetch();

        expect(primeFollowupModalSnapshotBuilderMock).toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellMock).toHaveBeenCalledTimes(1);
        expect(prefetchFollowupMemoPanelsMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionFollowupModalHostMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionFollowupModalPortalMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchExecutionFollowupDefaultTabMock).toHaveBeenCalledTimes(1);
        });
    });

    it('على lite يسخّن البوابة بلا الشِل ولوحات المذكرة', async () => {
        isLitePerformanceActiveMock.mockReturnValue(true);
        runExecutionFollowupOverlayPrefetch();

        expect(prefetchExecutionDashboardShellMock).not.toHaveBeenCalled();
        expect(prefetchFollowupMemoPanelsMock).not.toHaveBeenCalled();
        expect(prefetchExecutionFollowupModalHostMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionFollowupModalPortalMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchExecutionFollowupDefaultTabMock).toHaveBeenCalledTimes(1);
        });
    });
});
