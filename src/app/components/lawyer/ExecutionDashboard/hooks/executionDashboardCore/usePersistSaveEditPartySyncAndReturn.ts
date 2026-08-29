import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { usePartyEditWorkflow } from '../usePartyEditWorkflow';
import { useExecutionDashboardMaritalFurnitureFinancialSync } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardTimelineDedupeSync } from './useExecutionDashboardTimelineAndGraceSync';
import {
    useExecutionDashboardGuarantorDecisionSync,
    useExecutionDashboardDeceasedDebtorCoerciveReset,
    useExecutionDashboardSeizureRequestCreatedListener,
    useExecutionDashboardWindowEventListeners,
} from './useExecutionDashboardDecisionAndEventSync';
import type { ExecutionDashboardCorePersistHandlerPipelineInput } from './executionDashboardCorePersistHandlerPipelineInput';

export function usePersistSaveEditPartySyncAndReturn(input: {
    p: ExecutionDashboardCorePersistHandlerPipelineInput;
    saveExecutionData: unknown;
    executorApprovalActions: unknown;
    pushSeizureAuctionCalendarAppointment: unknown;
    pendingExecutorOpeners: unknown;
    tryOpenPendingBreakInventoryLedger: unknown;
    tryOpenPendingCustodianDetails: unknown;
    saveJudicialCustodianEntry: unknown;
    persistExecutionMergeBinding: unknown;
    persistExecutionMerge: (patch: Record<string, unknown>) => unknown;
    trashAndPinsHandlers: Record<string, unknown>;
}) {
    const { p, persistExecutionMerge, trashAndPinsHandlers } = input;
    const {
        executionData,
        executionId,
        decisionsReloadEpoch,
        coercionOrchestrator,
        showToast,
        timelineEvents,
        activeCoerciveActions,
        followupOrchestrator,
        nextTimelineId,
        pushTimelineEventRef,
        setShowDecisionsModal,
        showDecisionsModal,
        setTimelineEvents,
        decisionsStorageExecutionId,
        executionDataRef,
        seizureDraftsByDecisionIdRef,
        viewExecutionData,
        isHistoricalMode,
        activeSubFileId,
        parentDossierId,
        setSeizureDraftsByDecisionId,
        seizedAssetsSnapshotRef,
        maritalFurnitureItemsForFollowup,
        setActiveCoerciveActions,
        isMaritalFurnitureClaim,
        activeDebtorIsDeceased,
    } = p;

    const {
        timelineEditDraft,
        setTimelineEditDraft,
        moveTimelineEventToTrash,
        toggleTimelineEventPin,
        requestEditTimelineEvent,
        restoreTimelineEventFromTrash,
        permanentlyDeleteTimelineEvent,
        moveCaseNoteToTrash,
        moveCaseTaskToTrash,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        saveTimelineEditDraft,
        restoreCaseNoteFromTrash,
        permanentlyDeleteCaseNote,
        restoreCaseTaskFromTrash,
        permanentlyDeleteCaseTask,
    } = trashAndPinsHandlers as {
        timelineEditDraft: unknown;
        setTimelineEditDraft: unknown;
        moveTimelineEventToTrash: unknown;
        toggleTimelineEventPin: unknown;
        requestEditTimelineEvent: unknown;
        restoreTimelineEventFromTrash: unknown;
        permanentlyDeleteTimelineEvent: unknown;
        moveCaseNoteToTrash: unknown;
        moveCaseTaskToTrash: unknown;
        toggleCaseNotePin: unknown;
        toggleCaseTaskPin: unknown;
        saveTimelineEditDraft: unknown;
        restoreCaseNoteFromTrash: unknown;
        permanentlyDeleteCaseNote: unknown;
        restoreCaseTaskFromTrash: unknown;
        permanentlyDeleteCaseTask: unknown;
    };

    const partyEditWorkflow = usePartyEditWorkflow({
        executionData,
        viewExecutionData,
        executionDataRef: executionDataRef as MutableRefObject<ExecutionFile | null>,
        decisionsStorageExecutionId,
        isHistoricalMode,
        persistExecutionMerge,
        showToast,
    });

    const {
        editPartyTarget,
        setEditPartyTarget,
        partyEditDraft,
        setPartyEditDraft,
        partyEditHeirDeleteConfirmIdx,
        setPartyEditHeirDeleteConfirmIdx,
        heirsQuickView,
        setHeirsQuickView,
        openEditParty,
        buildPartyHeirsRows,
        openHeirsQuickView,
        savePartyEditDraft,
        removeHeirFromPartyEditDraftAtIndex,
        togglePartyEditHeirClient,
    } = partyEditWorkflow;

    useExecutionDashboardMaritalFurnitureFinancialSync({
        isMaritalFurnitureClaim,
        executionData,
        maritalFurnitureItemsForFollowup,
        persistExecutionMerge,
    });

    useExecutionDashboardTimelineDedupeSync({
        executionData,
        timelineEvents,
        activeSubFileId,
        parentDossierId,
        setTimelineEvents,
        persistExecutionMerge,
    });

    useExecutionDashboardSeizureRequestCreatedListener({
        executionData,
        executionId,
        seizureDraftsByDecisionIdRef: seizureDraftsByDecisionIdRef as MutableRefObject<
            Record<string, import('@/app/types/execution').SeizedAsset> | null
        >,
        seizedAssetsSnapshotRef,
        setSeizureDraftsByDecisionId: setSeizureDraftsByDecisionId as Dispatch<
            SetStateAction<Record<string, import('@/app/types/execution').SeizedAsset>>
        >,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMerge,
    });

    useExecutionDashboardGuarantorDecisionSync({
        executionData,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        persistExecutionMerge,
    });

    useExecutionDashboardDeceasedDebtorCoerciveReset({
        activeDebtorIsDeceased,
        activeCoerciveActions,
        debtorArrested: coercionOrchestrator.debtorArrested,
        investigationPathDebtorPresent: coercionOrchestrator.investigationPathDebtorPresent,
        executionData,
        setActiveCoerciveActions,
        setDebtorArrested: coercionOrchestrator.setDebtorArrested,
        setInvestigationPathDebtorPresent: coercionOrchestrator.setInvestigationPathDebtorPresent,
        persistExecutionMerge,
    });

    useExecutionDashboardWindowEventListeners({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        setShowDecisionsModal,
        openExecutionSeizuresTab: followupOrchestrator.openExecutionSeizuresTab,
        pushTimelineEventRef: pushTimelineEventRef as MutableRefObject<
            | ((
                  event: import('@/app/types/execution').TimelineEvent,
                  options?: { mergePatch?: Record<string, unknown> },
              ) => void)
            | null
        >,
        nextTimelineId,
        showDecisionsModal,
        showHeirsNotificationModal: followupOrchestrator.showHeirsNotificationModal,
        setShowHeirsNotificationModal: followupOrchestrator.setShowHeirsNotificationModal,
    });

    return {
        saveExecutionData: input.saveExecutionData,
        executorApprovalActions: input.executorApprovalActions,
        pushSeizureAuctionCalendarAppointment: input.pushSeizureAuctionCalendarAppointment,
        pendingExecutorOpeners: input.pendingExecutorOpeners,
        tryOpenPendingBreakInventoryLedger: input.tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails: input.tryOpenPendingCustodianDetails,
        saveJudicialCustodianEntry: input.saveJudicialCustodianEntry,
        persistExecutionMergeBinding: input.persistExecutionMergeBinding,
        persistExecutionMerge,
        trashAndPinsHandlers,
        timelineEditDraft,
        setTimelineEditDraft,
        moveTimelineEventToTrash,
        toggleTimelineEventPin,
        requestEditTimelineEvent,
        restoreTimelineEventFromTrash,
        permanentlyDeleteTimelineEvent,
        moveCaseNoteToTrash,
        moveCaseTaskToTrash,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        saveTimelineEditDraft,
        restoreCaseNoteFromTrash,
        permanentlyDeleteCaseNote,
        restoreCaseTaskFromTrash,
        permanentlyDeleteCaseTask,
        partyEditWorkflow,
        editPartyTarget,
        setEditPartyTarget,
        partyEditDraft,
        setPartyEditDraft,
        partyEditHeirDeleteConfirmIdx,
        setPartyEditHeirDeleteConfirmIdx,
        heirsQuickView,
        setHeirsQuickView,
        openEditParty,
        buildPartyHeirsRows,
        openHeirsQuickView,
        savePartyEditDraft,
        removeHeirFromPartyEditDraftAtIndex,
        togglePartyEditHeirClient,
    };
}
