import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    prefetchExecutionFollowupOverlay,
    prefetchExecutionFinanceOverlay,
    prefetchExecutionNotesOverlay,
    prefetchExecutionShellIntent,
} from '../executionDashboardOverlayPrefetch';

const isLitePerformanceActiveMock = vi.fn(() => false);
const prefetchExecutionDashboardShellMock = vi.fn();
const prefetchExecutionFollowupDefaultTabMock = vi.fn();
const prefetchExecutionFollowupTabMock = vi.fn();
const prefetchExecutionCoreHandlersMock = vi.fn();
const prefetchFollowupMemoPanelsMock = vi.fn();
const prefetchFinancialOperationsCenterMock = vi.fn();
const prefetchExecutionFinancialHubPortalMock = vi.fn();
const prefetchUnifiedSeizureLogHostMock = vi.fn();
const prefetchExecutionDashboardShellOverlaysMock = vi.fn();
const prefetchExecutionFollowupModalPortalMock = vi.fn();
const prefetchExecutionFollowupModalHostMock = vi.fn();

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => isLitePerformanceActiveMock(),
}));

vi.mock('../executionDashboardLazyRegistryShell', () => ({
    prefetchExecutionDashboardShell: () => prefetchExecutionDashboardShellMock(),
    prefetchFollowupMemoPanels: () => prefetchFollowupMemoPanelsMock(),
    prefetchUnifiedSeizureLogHost: () => prefetchUnifiedSeizureLogHostMock(),
    prefetchCustodyRemovalWardsModule: vi.fn(),
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

vi.mock('../executionFollowupTabPrefetch', () => ({
    prefetchExecutionFollowupDefaultTab: () => prefetchExecutionFollowupDefaultTabMock(),
    prefetchExecutionFollowupTab: (tabId: string) => prefetchExecutionFollowupTabMock(tabId),
}));

vi.mock('../executionDashboardShellOverlaysLazy', () => ({
    prefetchExecutionDashboardShellOverlays: () => prefetchExecutionDashboardShellOverlaysMock(),
}));

vi.mock('../executionFollowupModalLazy', () => ({
    prefetchExecutionFollowupModalPortal: () => prefetchExecutionFollowupModalPortalMock(),
}));

vi.mock('../executionFollowupHostLazy', () => ({
    prefetchExecutionFollowupModalHost: () => prefetchExecutionFollowupModalHostMock(),
}));

vi.mock('../executionCoreHandlersPrefetch', () => ({
    prefetchExecutionCoreHandlers: (mode: string) => prefetchExecutionCoreHandlersMock(mode),
}));

describe('executionDashboardOverlayPrefetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLitePerformanceActiveMock.mockReturnValue(false);
    });

    it('keeps shell intent focused on shell-only warming', () => {
        prefetchExecutionShellIntent();

        expect(prefetchExecutionDashboardShellMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionFollowupDefaultTabMock).not.toHaveBeenCalled();
        expect(prefetchExecutionCoreHandlersMock).not.toHaveBeenCalled();
    });

    it('loads followup critical path for explicit followup intent', async () => {
        prefetchExecutionFollowupOverlay();

        expect(prefetchExecutionDashboardShellMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionDashboardShellOverlaysMock).not.toHaveBeenCalled();
        expect(prefetchExecutionFollowupModalHostMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionFollowupModalPortalMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchExecutionFollowupDefaultTabMock).toHaveBeenCalledTimes(1);
        });
        expect(prefetchExecutionFollowupTabMock).not.toHaveBeenCalled();
        expect(prefetchExecutionCoreHandlersMock).toHaveBeenCalledWith('seizure-requests');
        expect(prefetchExecutionCoreHandlersMock).not.toHaveBeenCalledWith('light');
        expect(prefetchFollowupMemoPanelsMock).toHaveBeenCalledTimes(1);
    });

    it('warms followup critical path even when lite skips shell extras', async () => {
        isLitePerformanceActiveMock.mockReturnValue(true);
        prefetchExecutionFollowupOverlay();

        expect(prefetchExecutionDashboardShellMock).not.toHaveBeenCalled();
        expect(prefetchFollowupMemoPanelsMock).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellOverlaysMock).not.toHaveBeenCalled();
        expect(prefetchExecutionFollowupModalHostMock).toHaveBeenCalledTimes(1);
        expect(prefetchExecutionFollowupModalPortalMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchExecutionFollowupDefaultTabMock).toHaveBeenCalledTimes(1);
        });
        expect(prefetchExecutionFollowupTabMock).not.toHaveBeenCalled();
        expect(prefetchExecutionCoreHandlersMock).toHaveBeenCalledWith('seizure-requests');
    });

    it('does not warm the followup tab for finance intent', async () => {
        prefetchExecutionFinanceOverlay();

        expect(prefetchExecutionDashboardShellMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchFinancialOperationsCenterMock).toHaveBeenCalledTimes(1);
            expect(prefetchExecutionFinancialHubPortalMock).toHaveBeenCalledTimes(1);
        });
        expect(prefetchExecutionFollowupDefaultTabMock).not.toHaveBeenCalled();
        expect(prefetchExecutionDashboardShellOverlaysMock).not.toHaveBeenCalled();
    });

    it('warms the shell overlays barrel on notes intent', () => {
        prefetchExecutionNotesOverlay();
        expect(prefetchExecutionDashboardShellOverlaysMock).toHaveBeenCalledTimes(1);
    });
});
