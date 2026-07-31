import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardSaveApprovalCluster } from '../useExecutionDashboardSaveApprovalCluster';

const useExecutionDashboardSaveExecutionDataMock = vi.fn();
const useExecutionDashboardExecutorApprovalActionsMock = vi.fn();
const useExecutionDashboardPushSeizureAuctionCalendarAppointmentMock = vi.fn();
const useExecutionDashboardPendingExecutorDecisionOpenersMock = vi.fn();

vi.mock('../useExecutionDashboardSaveExecutionData', () => ({
    useExecutionDashboardSaveExecutionData: (...args: unknown[]) =>
        useExecutionDashboardSaveExecutionDataMock(...args),
}));

vi.mock('../useExecutionDashboardExecutorApprovalActions', () => ({
    useExecutionDashboardExecutorApprovalActions: (...args: unknown[]) =>
        useExecutionDashboardExecutorApprovalActionsMock(...args),
}));

vi.mock('../useExecutionDashboardPushSeizureAuctionCalendarAppointment', () => ({
    useExecutionDashboardPushSeizureAuctionCalendarAppointment: (...args: unknown[]) =>
        useExecutionDashboardPushSeizureAuctionCalendarAppointmentMock(...args),
}));

vi.mock('../useExecutionDashboardPendingExecutorDecisionOpeners', () => ({
    useExecutionDashboardPendingExecutorDecisionOpeners: (...args: unknown[]) =>
        useExecutionDashboardPendingExecutorDecisionOpenersMock(...args),
}));

describe('useExecutionDashboardSaveApprovalCluster', () => {
    it('wires save approval hooks and re-exports their surfaced outputs', () => {
        useExecutionDashboardSaveExecutionDataMock.mockReturnValue('save-handler');
        useExecutionDashboardExecutorApprovalActionsMock.mockReturnValue({ openDecision: vi.fn() });
        useExecutionDashboardPushSeizureAuctionCalendarAppointmentMock.mockReturnValue('push-handler');
        useExecutionDashboardPendingExecutorDecisionOpenersMock.mockReturnValue({
            tryOpenPendingBreakInventoryLedger: vi.fn(),
            tryOpenPendingCustodianDetails: vi.fn(),
        });

        const input = {
            executionId: 'ex-1',
            executionData: null,
            debtorNotificationDate: null,
            debtorSummonsMarkerLocal: null,
            lastActionDate: null,
            executionFeeInjected: false,
            timelineEvents: [],
            caseNotesLog: [],
            caseTasksPending: [],
            financialLedger: [],
            gracePeriodActive: false,
            gracePeriodEnded: false,
            seizedAssets: [],
            seizureDraftsByDecisionId: {},
            realEstateSeizureAssets: [],
            activeCoerciveActions: [],
            notificationCount: 0,
            forcedAttendanceIssued: false,
            debtorEvaded: false,
            arrestWarrantUnlocked: false,
            creditorAttended: false,
            executionPaused: false,
            coercionOrchestrator: {
                activeNoticeState: 'none',
                debtorAttendedVoluntarily: false,
                debtorForcedToAttend: false,
                debtorArrested: false,
                nonInterferenceIssued: false,
                summoningRound: 1,
                voluntaryAttendanceCount: 0,
                investigationCourtRequested: false,
                investigationMemoIssued: false,
                investigationPathDebtorPresent: false,
                forcedPathAttendanceSecured: false,
            },
            paidDebt: 0,
            paidCourtFees: 0,
            paidDirectorateFees: 0,
            paidClientFees: 0,
            followupOrchestrator: {
                evictionVacateDeadlineLocal: null,
                evictionResidentialGracePeriodStart: null,
                evictionExecutorVacateGrantApproved: false,
                evictionResidentialGraceManuallyEndedAt: null,
                evictionAssetsTabUnlocked: false,
                evictionCaseExpenses: null,
                encroachmentCaseExpenses: null,
                specificDeliveryCaseExpenses: null,
                setShowUnifiedExecutionModal: vi.fn(),
                setUnifiedModalTab: vi.fn(),
                setFollowupExpandProcedureKey: vi.fn(),
            },
            earnerFeeCollectionSm: null,
            file: null,
            currentFileId: 'ex-1',
            isMaritalFurnitureClaim: false,
            nextTimelineId: vi.fn(() => 'tl-1'),
            timelineEventsRef: { current: [] },
            persistExecutionMergeRef: { current: null },
            executionFileSnapshotRef: { current: null },
            showToast: vi.fn(),
            setShowDecisionsModal: vi.fn(),
            setCaseTasksPending: vi.fn(),
            setTimelineEvents: vi.fn(),
            setExecutionReportPrompt: vi.fn(),
            setJudicialCustodianModalCtx: vi.fn(),
            setJudicialCustodianModalOpen: vi.fn(),
            setCaseNotesLog: vi.fn(),
            decisionsStorageExecutionId: 'ex-1',
            openBreakInventoryCompletion: vi.fn(),
            openJudicialCustodianCompletion: vi.fn(),
        };

        const { result } = renderHook(() =>
            useExecutionDashboardSaveApprovalCluster(input as never),
        );

        expect(useExecutionDashboardSaveExecutionDataMock).toHaveBeenCalled();
        expect(useExecutionDashboardExecutorApprovalActionsMock).toHaveBeenCalled();
        expect(useExecutionDashboardPushSeizureAuctionCalendarAppointmentMock).toHaveBeenCalledWith({
            openDecision: expect.any(Function),
        });
        expect(useExecutionDashboardPendingExecutorDecisionOpenersMock).toHaveBeenCalled();
        expect(result.current.saveExecutionData).toBe('save-handler');
        expect(result.current.pushSeizureAuctionCalendarAppointment).toBe('push-handler');
        expect(result.current.pendingExecutorOpeners.tryOpenPendingBreakInventoryLedger).toBeTypeOf('function');
    });
});
