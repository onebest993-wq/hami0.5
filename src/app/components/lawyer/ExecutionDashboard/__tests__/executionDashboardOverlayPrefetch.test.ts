import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    prefetchExecutionFollowupOverlay,
    prefetchExecutionFinanceOverlay,
    prefetchExecutionNotesOverlay,
    prefetchExecutionShellIntent,
    prefetchExecutionActionGridTile,
} from '../executionDashboardOverlayPrefetch';
import { loadAndCacheFollowupModalSnapshotBuilder } from '../hooks/followupModalSnapshotBuilderCache';

const isLitePerformanceActiveMock = vi.fn(() => false);
const prefetchExecutionDashboardShellMock = vi.fn();
const prefetchExecutionCoreHandlersMock = vi.fn();
const prefetchFinancialOperationsCenterMock = vi.fn();
const prefetchExecutionFinancialHubPortalMock = vi.fn();
const prefetchExecutionDashboardShellOverlaysMock = vi.fn();
const runExecutionFollowupOverlayPrefetchMock = vi.fn();

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => isLitePerformanceActiveMock(),
}));

vi.mock('../executionDashboardLazyRegistryShell', () => ({
    prefetchExecutionDashboardShell: () => prefetchExecutionDashboardShellMock(),
    prefetchCustodyRemovalWardsModule: vi.fn(),
}));

vi.mock('../executionFollowupOverlayPrefetchRuntime', () => ({
    runExecutionFollowupOverlayPrefetch: (...args: unknown[]) =>
        runExecutionFollowupOverlayPrefetchMock(...args),
}));

vi.mock('../executionDashboardLazyRegistryOverlays', () => ({
    prefetchDecisionsAndAppealsEngine: vi.fn(),
    prefetchFinancialOperationsCenter: () => prefetchFinancialOperationsCenterMock(),
    prefetchLawReferencePanel: vi.fn(),
    prefetchExecutionDecisionsModalContainer: vi.fn(),
    prefetchExecutionFinancialHubPortal: () => prefetchExecutionFinancialHubPortalMock(),
    prefetchExecutionNotesAndAppointmentModals: vi.fn(),
    prefetchExecutionDocumentVault: vi.fn(),
}));

vi.mock('../executionDashboardShellOverlaysLazy', () => ({
    prefetchExecutionDashboardShellOverlays: () => prefetchExecutionDashboardShellOverlaysMock(),
}));

vi.mock('../executionCoreHandlersPrefetch', () => ({
    prefetchExecutionCoreHandlers: (mode: string) => prefetchExecutionCoreHandlersMock(mode),
}));

vi.mock('../hooks/followupModalSnapshotBuilderCache', () => ({
    loadAndCacheFollowupModalSnapshotBuilder: vi.fn(() => Promise.resolve(() => ({}))),
}));

describe('executionDashboardOverlayPrefetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLitePerformanceActiveMock.mockReturnValue(false);
    });

    it('keeps shell intent focused on shell-only warming', () => {
        prefetchExecutionShellIntent();

        expect(prefetchExecutionDashboardShellMock).toHaveBeenCalledTimes(1);
        expect(runExecutionFollowupOverlayPrefetchMock).not.toHaveBeenCalled();
        expect(prefetchExecutionCoreHandlersMock).not.toHaveBeenCalled();
    });

    it('loads followup critical path for explicit followup intent', async () => {
        prefetchExecutionFollowupOverlay();

        expect(prefetchExecutionDashboardShellMock).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellOverlaysMock).not.toHaveBeenCalled();
        expect(loadAndCacheFollowupModalSnapshotBuilder).toHaveBeenCalled();
        expect(prefetchExecutionCoreHandlersMock).toHaveBeenCalledWith('seizure-requests');
        expect(prefetchExecutionCoreHandlersMock).not.toHaveBeenCalledWith('light');
        await vi.waitFor(() => {
            expect(runExecutionFollowupOverlayPrefetchMock).toHaveBeenCalledTimes(1);
        });
    });

    it('يمرّر تبويب المحضر المحفوظ حتى لا تُسخَّن طلبات الحجز بدل المخاطبات', async () => {
        prefetchExecutionFollowupOverlay('correspondences');
        await vi.waitFor(() => {
            expect(runExecutionFollowupOverlayPrefetchMock).toHaveBeenCalledWith('correspondences');
        });
    });

    it('warms followup critical path even when lite skips shell extras', async () => {
        isLitePerformanceActiveMock.mockReturnValue(true);
        prefetchExecutionFollowupOverlay();

        expect(prefetchExecutionDashboardShellMock).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellOverlaysMock).not.toHaveBeenCalled();
        expect(loadAndCacheFollowupModalSnapshotBuilder).toHaveBeenCalled();
        expect(prefetchExecutionCoreHandlersMock).toHaveBeenCalledWith('seizure-requests');
        await vi.waitFor(() => {
            expect(runExecutionFollowupOverlayPrefetchMock).toHaveBeenCalledTimes(1);
        });
    });

    it('does not warm the followup tab for finance intent', async () => {
        prefetchExecutionFinanceOverlay();

        expect(prefetchExecutionDashboardShellMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchFinancialOperationsCenterMock).toHaveBeenCalledTimes(1);
            expect(prefetchExecutionFinancialHubPortalMock).toHaveBeenCalledTimes(1);
        });
        expect(runExecutionFollowupOverlayPrefetchMock).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellOverlaysMock).not.toHaveBeenCalled();
    });

    it('warms the shell overlays barrel on notes intent', async () => {
        prefetchExecutionNotesOverlay();
        await vi.waitFor(() => {
            expect(prefetchExecutionDashboardShellOverlaysMock).toHaveBeenCalledTimes(1);
        });
    });

    it('خلفية المالية تُتخطى على lite؛ نية البلاطة تُسخَّن', async () => {
        isLitePerformanceActiveMock.mockReturnValue(true);
        prefetchExecutionFinanceOverlay();
        expect(prefetchFinancialOperationsCenterMock).not.toHaveBeenCalled();

        prefetchExecutionActionGridTile('finance');
        await vi.waitFor(() => {
            expect(prefetchFinancialOperationsCenterMock).toHaveBeenCalledTimes(1);
            expect(prefetchExecutionFinancialHubPortalMock).toHaveBeenCalledTimes(1);
        });
    });
});
