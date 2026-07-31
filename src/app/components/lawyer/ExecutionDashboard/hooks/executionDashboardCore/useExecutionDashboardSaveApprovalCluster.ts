import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { useExecutionDashboardSaveExecutionData } from './useExecutionDashboardSaveExecutionData';
import {
    useExecutionDashboardExecutorApprovalActions,
    type UseExecutionDashboardExecutorApprovalActionsParams,
} from './useExecutionDashboardExecutorApprovalActions';
import { useExecutionDashboardPushSeizureAuctionCalendarAppointment } from './useExecutionDashboardPushSeizureAuctionCalendarAppointment';
import { useExecutionDashboardPendingExecutorDecisionOpeners } from './useExecutionDashboardPendingExecutorDecisionOpeners';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';
import type { EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollectionMachine';

type ShowToast = (
    message: string,
    type?: string,
) => void;
type ExecutorApprovalSetters = Pick<
    UseExecutionDashboardExecutorApprovalActionsParams,
    | 'setCaseTasksPending'
    | 'setTimelineEvents'
    | 'setExecutionReportPrompt'
    | 'setJudicialCustodianModalCtx'
    | 'setJudicialCustodianModalOpen'
    | 'setCaseNotesLog'
>;

export type ExecutionDashboardSaveApprovalClusterInput = {
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionDataRef?: MutableRefObject<ExecutionFile | null | undefined>;
    debtorNotificationDate: string | null;
    debtorSummonsMarkerLocal: unknown;
    lastActionDate: string | null | undefined;
    executionFeeInjected: boolean;
    timelineEvents: TimelineEvent[];
    caseNotesLog: NonNullable<ExecutionFile['caseNotesLog']>;
    caseTasksPending: NonNullable<ExecutionFile['caseTasksPending']>;
    financialLedger: NonNullable<ExecutionFile['financialLedger']>;
    gracePeriodActive: boolean;
    gracePeriodEnded: boolean;
    seizedAssets: NonNullable<ExecutionFile['seizedAssets']>;
    seizureDraftsByDecisionId: ExecutionFile['seizureDraftsByDecisionId'];
    realEstateSeizureAssets: NonNullable<ExecutionFile['realEstateSeizureAssets']>;
    activeCoerciveActions: string[];
    notificationCount: number;
    forcedAttendanceIssued: boolean;
    debtorEvaded: boolean;
    arrestWarrantUnlocked: boolean;
    creditorAttended: boolean;
    executionPaused: boolean;
    coercionOrchestrator: {
        activeNoticeState: string;
        debtorAttendedVoluntarily: boolean;
        debtorForcedToAttend: boolean;
        debtorArrested: boolean;
        nonInterferenceIssued: boolean;
        summoningRound: number;
        voluntaryAttendanceCount: number;
        investigationCourtRequested: boolean;
        investigationMemoIssued: boolean;
        investigationPathDebtorPresent: boolean;
        forcedPathAttendanceSecured: boolean;
    };
    paidDebt: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    followupOrchestrator: {
        evictionVacateDeadlineLocal?: string | null;
        evictionResidentialGracePeriodStart?: string | null;
        evictionExecutorVacateGrantApproved?: boolean;
        evictionResidentialGraceManuallyEndedAt?: string | null;
        evictionAssetsTabUnlocked?: boolean;
        evictionCaseExpenses?: unknown;
        encroachmentCaseExpenses?: unknown;
        specificDeliveryCaseExpenses?: unknown;
        setShowUnifiedExecutionModal: (open: boolean) => void;
        setUnifiedModalTab: Dispatch<SetStateAction<string>>;
        setFollowupExpandProcedureKey: Dispatch<SetStateAction<string | null>>;
    };
    earnerFeeCollectionSm: EvictionEarnerFeeCollectionSM;
    file: ExecutionFile | null | undefined;
    currentFileId: string;
    isMaritalFurnitureClaim: boolean;
    nextTimelineId: () => string;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    executionFileSnapshotRef: MutableRefObject<ExecutionFile | null>;
    showToast: ShowToast;
    setShowDecisionsModal: (open: boolean) => void;
    setCaseTasksPending: ExecutorApprovalSetters['setCaseTasksPending'];
    setTimelineEvents: ExecutorApprovalSetters['setTimelineEvents'];
    setExecutionReportPrompt: ExecutorApprovalSetters['setExecutionReportPrompt'];
    setJudicialCustodianModalCtx: ExecutorApprovalSetters['setJudicialCustodianModalCtx'];
    setJudicialCustodianModalOpen: ExecutorApprovalSetters['setJudicialCustodianModalOpen'];
    setCaseNotesLog: ExecutorApprovalSetters['setCaseNotesLog'];
    decisionsStorageExecutionId: string;
    openBreakInventoryCompletion: (
        decisionId: string,
        actions: ExecutorApprovalActions,
        requestTitle: string,
    ) => void;
    openJudicialCustodianCompletion: (
        decisionId: string,
        actions: ExecutorApprovalActions,
        requestTitle: string,
    ) => void;
};

export function useExecutionDashboardSaveApprovalCluster(
    input: ExecutionDashboardSaveApprovalClusterInput,
) {
    const saveExecutionData = useExecutionDashboardSaveExecutionData({
        executionId: input.executionId,
        executionData: input.executionData,
        executionDataRef: input.executionDataRef,
        debtorNotificationDate: input.debtorNotificationDate,
        debtorSummonsMarkerLocal: input.debtorSummonsMarkerLocal,
        lastActionDate: input.lastActionDate,
        executionFeeInjected: input.executionFeeInjected,
        timelineEvents: input.timelineEvents,
        caseNotesLog: input.caseNotesLog,
        caseTasksPending: input.caseTasksPending,
        financialLedger: input.financialLedger,
        gracePeriodActive: input.gracePeriodActive,
        gracePeriodEnded: input.gracePeriodEnded,
        seizedAssets: input.seizedAssets,
        seizureDraftsByDecisionId: input.seizureDraftsByDecisionId,
        realEstateSeizureAssets: input.realEstateSeizureAssets,
        activeCoerciveActions: input.activeCoerciveActions,
        notificationCount: input.notificationCount,
        forcedAttendanceIssued: input.forcedAttendanceIssued,
        debtorEvaded: input.debtorEvaded,
        arrestWarrantUnlocked: input.arrestWarrantUnlocked,
        creditorAttended: input.creditorAttended,
        executionPaused: input.executionPaused,
        activeNoticeState: input.coercionOrchestrator.activeNoticeState,
        debtorAttendedVoluntarily: input.coercionOrchestrator.debtorAttendedVoluntarily,
        debtorForcedToAttend: input.coercionOrchestrator.debtorForcedToAttend,
        debtorArrested: input.coercionOrchestrator.debtorArrested,
        nonInterferenceIssued: input.coercionOrchestrator.nonInterferenceIssued,
        paidDebt: input.paidDebt,
        paidCourtFees: input.paidCourtFees,
        paidDirectorateFees: input.paidDirectorateFees,
        paidClientFees: input.paidClientFees,
        summoningRound: input.coercionOrchestrator.summoningRound,
        voluntaryAttendanceCount: input.coercionOrchestrator.voluntaryAttendanceCount,
        investigationCourtRequested: input.coercionOrchestrator.investigationCourtRequested,
        investigationMemoIssued: input.coercionOrchestrator.investigationMemoIssued,
        investigationPathDebtorPresent: input.coercionOrchestrator.investigationPathDebtorPresent,
        forcedPathAttendanceSecured: input.coercionOrchestrator.forcedPathAttendanceSecured,
        evictionVacateDeadlineLocal: input.followupOrchestrator.evictionVacateDeadlineLocal,
        evictionResidentialGracePeriodStart: input.followupOrchestrator.evictionResidentialGracePeriodStart,
        evictionExecutorVacateGrantApproved: input.followupOrchestrator.evictionExecutorVacateGrantApproved,
        evictionResidentialGraceManuallyEndedAt:
            input.followupOrchestrator.evictionResidentialGraceManuallyEndedAt,
        evictionAssetsTabUnlocked: input.followupOrchestrator.evictionAssetsTabUnlocked,
        evictionCaseExpenses: input.followupOrchestrator.evictionCaseExpenses,
        encroachmentCaseExpenses: input.followupOrchestrator.encroachmentCaseExpenses,
        specificDeliveryCaseExpenses: input.followupOrchestrator.specificDeliveryCaseExpenses,
        earnerFeeCollectionSm: input.earnerFeeCollectionSm,
    });

    const executorApprovalActions = useExecutionDashboardExecutorApprovalActions({
        executionData: input.executionData,
        executionId: input.executionId,
        file: input.file,
        currentFileId: input.currentFileId,
        isMaritalFurnitureClaim: input.isMaritalFurnitureClaim,
        nextTimelineId: input.nextTimelineId,
        timelineEventsRef: input.timelineEventsRef,
        persistExecutionMergeRef: input.persistExecutionMergeRef,
        executionFileSnapshotRef: input.executionFileSnapshotRef,
        showToast: input.showToast,
        setShowDecisionsModal: input.setShowDecisionsModal,
        setShowUnifiedExecutionModal: input.followupOrchestrator.setShowUnifiedExecutionModal,
        setUnifiedModalTab: input.followupOrchestrator.setUnifiedModalTab,
        setFollowupExpandProcedureKey: input.followupOrchestrator.setFollowupExpandProcedureKey,
        setCaseTasksPending: input.setCaseTasksPending,
        setTimelineEvents: input.setTimelineEvents,
        setExecutionReportPrompt: input.setExecutionReportPrompt,
        setJudicialCustodianModalCtx: input.setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen: input.setJudicialCustodianModalOpen,
        setCaseNotesLog: input.setCaseNotesLog,
    });

    const pushSeizureAuctionCalendarAppointment =
        useExecutionDashboardPushSeizureAuctionCalendarAppointment(executorApprovalActions);

    const pendingExecutorOpeners = useExecutionDashboardPendingExecutorDecisionOpeners({
        executionId: input.executionId,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executorApprovalActions,
        setShowDecisionsModal: input.setShowDecisionsModal,
        openBreakInventoryCompletion: input.openBreakInventoryCompletion,
        openJudicialCustodianCompletion: input.openJudicialCustodianCompletion,
    });

    const { tryOpenPendingBreakInventoryLedger, tryOpenPendingCustodianDetails } =
        pendingExecutorOpeners;

    return {
        saveExecutionData,
        executorApprovalActions,
        pushSeizureAuctionCalendarAppointment,
        pendingExecutorOpeners,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
    };
}
