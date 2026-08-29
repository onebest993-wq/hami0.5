/** Phase C Slice 27b — persist/save + trash/party edit + event sync */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardSaveExecutionData } from './useExecutionDashboardSaveExecutionData';
import type { UseExecutionDashboardSaveExecutionDataParams } from './useExecutionDashboardSaveExecutionData';
import {
    useExecutionDashboardExecutorApprovalActions,
    type UseExecutionDashboardExecutorApprovalActionsParams,
} from './useExecutionDashboardExecutorApprovalActions';
import { useExecutionDashboardPushSeizureAuctionCalendarAppointment } from './useExecutionDashboardPushSeizureAuctionCalendarAppointment';
import { useExecutionDashboardPendingExecutorDecisionOpeners } from './useExecutionDashboardPendingExecutorDecisionOpeners';
import type { UseExecutionDashboardPendingExecutorDecisionOpenersParams } from './useExecutionDashboardPendingExecutorDecisionOpeners';
import type { UseExecutionDashboardPersistExecutionMergeParams } from './useExecutionDashboardPersistExecutionMerge';
import { useExecutionDashboardPersistExecutionMerge } from './useExecutionDashboardPersistExecutionMerge';
import { useSaveJudicialCustodianEntry } from './useSaveJudicialCustodianEntry';
import { useExecutionTrashAndPins } from '../useExecutionTrashAndPins';
import { useExecutionDashboardFieldVisitScheduledListener } from './useExecutionDashboardRuntimeSyncEffects';
import type { ExecutionDashboardCorePersistHandlerPipelineInput } from './executionDashboardCorePersistHandlerPipelineInput';
import { usePersistSaveEditPartySyncAndReturn } from './usePersistSaveEditPartySyncAndReturn';

export function useExecutionDashboardCorePersistSaveEditSegment(
    p: ExecutionDashboardCorePersistHandlerPipelineInput,
) {
    const {
        executionData,
        executionId,
        decisionsReloadEpoch,
        notificationCount,
        forcedAttendanceIssued,
        coercionOrchestrator,
        debtorNotificationDate,
        debtorSummonsMarkerLocal,
        remaining,
        executionFeeInjected,
        showToast,
        lastActionDate,
        timelineEvents,
        caseNotesLog,
        caseTasksPending,
        financialLedger,
        gracePeriodActive,
        gracePeriodEnded,
        seizedAssets,
        seizureDraftsByDecisionId,
        realEstateSeizureAssets,
        activeCoerciveActions,
        debtorEvaded,
        arrestWarrantUnlocked,
        creditorAttended,
        executionPaused,
        paidDebt,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        earnerFeeCollectionSm,
        followupOrchestrator,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMergeRef,
        pushTimelineEventRef,
        executionFileSnapshotRef,
        setShowDecisionsModal,
        showDecisionsModal,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setCaseNotesLog,
        decisionsStorageExecutionId,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
        isUnifiedTabActive,
        unifiedTabId,
        onUpdate,
        executionDataRef,
        seizureDraftsByDecisionIdRef,
        setExecutionStorageTick,
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        caseNotesLogRef,
        caseTasksPendingRef,
        setPermanentDeleteTimelineId,
        viewExecutionData,
        isHistoricalMode,
        activeSubFileId,
        parentDossierId,
        setSeizureDraftsByDecisionId,
        seizedAssetsSnapshotRef,
        maritalFurnitureItemsForFollowup,
        setActiveCoerciveActions,
        isRepresentingDebtor,
        activeDebtorIsDeceased,
    } = p;

    const saveExecutionData = useExecutionDashboardSaveExecutionData({
        executionId,
        executionData,
        debtorNotificationDate,
        debtorSummonsMarkerLocal,
        lastActionDate,
        executionFeeInjected,
        timelineEvents,
        caseNotesLog,
        caseTasksPending,
        financialLedger,
        gracePeriodActive,
        gracePeriodEnded,
        seizedAssets,
        seizureDraftsByDecisionId,
        realEstateSeizureAssets,
        activeCoerciveActions,
        notificationCount,
        forcedAttendanceIssued,
        debtorEvaded,
        arrestWarrantUnlocked,
        creditorAttended,
        executionPaused,
        activeNoticeState: coercionOrchestrator.activeNoticeState,
        debtorAttendedVoluntarily: coercionOrchestrator.debtorAttendedVoluntarily,
        debtorForcedToAttend: coercionOrchestrator.debtorForcedToAttend,
        debtorArrested: coercionOrchestrator.debtorArrested,
        nonInterferenceIssued: coercionOrchestrator.nonInterferenceIssued,
        paidDebt,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        summoningRound: coercionOrchestrator.summoningRound,
        voluntaryAttendanceCount: coercionOrchestrator.voluntaryAttendanceCount,
        investigationCourtRequested: coercionOrchestrator.investigationCourtRequested,
        investigationMemoIssued: coercionOrchestrator.investigationMemoIssued,
        investigationPathDebtorPresent: coercionOrchestrator.investigationPathDebtorPresent,
        forcedPathAttendanceSecured: coercionOrchestrator.forcedPathAttendanceSecured,
        evictionVacateDeadlineLocal: followupOrchestrator.evictionVacateDeadlineLocal,
        evictionResidentialGracePeriodStart: followupOrchestrator.evictionResidentialGracePeriodStart,
        evictionExecutorVacateGrantApproved: followupOrchestrator.evictionExecutorVacateGrantApproved,
        evictionResidentialGraceManuallyEndedAt: followupOrchestrator.evictionResidentialGraceManuallyEndedAt,
        evictionAssetsTabUnlocked: followupOrchestrator.evictionAssetsTabUnlocked,
        evictionCaseExpenses: followupOrchestrator.evictionCaseExpenses,
        encroachmentCaseExpenses: followupOrchestrator.encroachmentCaseExpenses,
        specificDeliveryCaseExpenses: followupOrchestrator.specificDeliveryCaseExpenses,
        earnerFeeCollectionSm: earnerFeeCollectionSm as import('@/app/utils/evictionEarnerFeeCollectionMachine').EvictionEarnerFeeCollectionSM,
    } as UseExecutionDashboardSaveExecutionDataParams);

    const executorApprovalActions = useExecutionDashboardExecutorApprovalActions({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        file: file as ExecutionFile | null | undefined,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMergeRef,
        executionFileSnapshotRef,
        showToast,
        setShowDecisionsModal,
        openFollowupModalPersisted: p.openFollowupModalPersisted,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setUnifiedModalTab: followupOrchestrator.setUnifiedModalTab as UseExecutionDashboardExecutorApprovalActionsParams['setUnifiedModalTab'],
        setFollowupExpandProcedureKey: followupOrchestrator.setFollowupExpandProcedureKey as UseExecutionDashboardExecutorApprovalActionsParams['setFollowupExpandProcedureKey'],
        setCaseTasksPending:
            setCaseTasksPending as UseExecutionDashboardExecutorApprovalActionsParams['setCaseTasksPending'],
        setTimelineEvents,
        setExecutionReportPrompt:
            setExecutionReportPrompt as UseExecutionDashboardExecutorApprovalActionsParams['setExecutionReportPrompt'],
        setJudicialCustodianModalCtx:
            setJudicialCustodianModalCtx as UseExecutionDashboardExecutorApprovalActionsParams['setJudicialCustodianModalCtx'],
        setJudicialCustodianModalOpen,
        setCaseNotesLog:
            setCaseNotesLog as UseExecutionDashboardExecutorApprovalActionsParams['setCaseNotesLog'],
    });

    const pushSeizureAuctionCalendarAppointment =
        useExecutionDashboardPushSeizureAuctionCalendarAppointment(executorApprovalActions);

    const pendingExecutorOpeners = useExecutionDashboardPendingExecutorDecisionOpeners({
        executionId,
        decisionsStorageExecutionId,
        executionData: executionData as Record<string, unknown> | null | undefined,
        executorApprovalActions,
        setShowDecisionsModal,
        openBreakInventoryCompletion: openBreakInventoryCompletion as UseExecutionDashboardPendingExecutorDecisionOpenersParams['openBreakInventoryCompletion'],
        openJudicialCustodianCompletion: openJudicialCustodianCompletion as UseExecutionDashboardPendingExecutorDecisionOpenersParams['openJudicialCustodianCompletion'],
    });

    const { tryOpenPendingBreakInventoryLedger, tryOpenPendingCustodianDetails } =
        pendingExecutorOpeners;

    const saveJudicialCustodianEntry = useSaveJudicialCustodianEntry({
        decisionsStorageExecutionId,
        executionDataId: executionData?.id,
        executionId,
        executorApprovalActions,
        showToast,
    });

    useExecutionDashboardFieldVisitScheduledListener({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        executorApprovalActions,
    });

    const persistExecutionMergeBinding = useExecutionDashboardPersistExecutionMerge({
        executionId,
        isUnifiedTabActive,
        unifiedTabId,
        onUpdate,
        executionDataRef,
        seizureDraftsByDecisionIdRef:
            seizureDraftsByDecisionIdRef as UseExecutionDashboardPersistExecutionMergeParams['seizureDraftsByDecisionIdRef'],
        setExecutionStorageTick,
        isRepresentingDebtor,
        showToast,
    });

    const { persistExecutionMerge } = persistExecutionMergeBinding;

    persistExecutionMergeRef.current = persistExecutionMerge;
    executionFileSnapshotRef.current = executionData ?? null;

    const trashAndPinsHandlers = useExecutionTrashAndPins({
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        timelineEventsRef,
        caseNotesLogRef: caseNotesLogRef as MutableRefObject<NonNullable<ExecutionFile['caseNotesLog']>>,
        caseTasksPendingRef: caseTasksPendingRef as MutableRefObject<
            NonNullable<ExecutionFile['caseTasksPending']>
        >,
        setTimelineEvents,
        setCaseNotesLog: setCaseNotesLog as Dispatch<
            SetStateAction<NonNullable<ExecutionFile['caseNotesLog']>>
        >,
        setCaseTasksPending: setCaseTasksPending as Dispatch<
            SetStateAction<NonNullable<ExecutionFile['caseTasksPending']>>
        >,
        persistExecutionMerge,
        showToast,
        currentFileId,
        setPermanentDeleteTimelineId,
    });

    return usePersistSaveEditPartySyncAndReturn({
        p,
        saveExecutionData,
        executorApprovalActions,
        pushSeizureAuctionCalendarAppointment,
        pendingExecutorOpeners,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        saveJudicialCustodianEntry,
        persistExecutionMergeBinding,
        persistExecutionMerge,
        trashAndPinsHandlers,
    });
}

