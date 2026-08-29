/** Phase C Slice 27 — workspace orchestrators + timeline/seizure/coercive state */
import { useState, useRef, useMemo } from 'react';
import { getPersonalCoerciveSubtypeOutcome } from '@/app/utils/executorSeizureDecisionQueue';
import { useTodayYmd } from '../useTodayYmd';
import { useToastSystem } from '../useToastSystem';
import { useThirdPartySeizuresUi } from '../useThirdPartySeizuresUi';
import { useSeizureApprovalToast } from '../useSeizureApprovalToast';
import { useExecutionFollowupOrchestrator } from '../../orchestrators/useExecutionFollowupOrchestrator';
import { useExecutionCoercionOrchestrator } from '../../orchestrators/useExecutionCoercionOrchestrator';
import { useExecutionDossierLifecyclePanelOrchestrator } from '../../orchestrators/useExecutionDossierLifecyclePanelOrchestrator';
import { useExecutionDecisionsOrchestrator } from '../../orchestrators/useExecutionDecisionsOrchestrator';
import { useExecutionFinancialOrchestrator } from '../../orchestrators/useExecutionFinancialOrchestrator';
import { useExecutionDashboardOpenDecisionsModalBridge } from './useExecutionDashboardOpenDecisionsModalBridge';
import {
    useExecutionDashboardDebtorTabResetOnFileChange,
    useExecutionDashboardSummonsPopoverEscapeClose,
    useExecutionDashboardExecutionPausedSync,
    useExecutionDashboardSpecialRequestTemplateMenuDismiss,
    useExecutionDashboardPaidClientFeesSync,
    useExecutionDashboardDossierLifecycleDraftSync,
    useExecutionDashboardPerformanceMonitor,
} from './useExecutionDashboardRuntimeSyncEffects';
import {
    useExecutionDecisionOutcomeToastBridge,
    useExecutionToastBridge,
} from '../useExecutionDashboardWindowBridge';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';
import { useExecutionDashboardWorkspaceLocalUiState } from './useExecutionDashboardWorkspaceLocalUiState';
import { useExecutionDashboardTimelineAssetsCluster } from './useExecutionDashboardTimelineAssetsCluster';

export function useExecutionDashboardCoreWorkspacePipeline(p: ExecutionDashboardCoreWorkspacePipelineInput) {
    const {
        modals,
        executionData,
        executionFileKey,
        executionDashboardFileId,
        executionId,
        decisionsStorageExecutionId,
        setExecutionModal,
        showDecisionsModal,
        setShowDecisionsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
    } = p;

    const todayYmd = useTodayYmd();

    const {
        noteTitle, setNoteTitle,
        noteBody, setNoteBody,
        isTask, setIsTask,
        taskDueDate, setTaskDueDate,
        taskStatus, setTaskStatus,
        editingTaskId, setEditingTaskId,
        editingNoteId, setEditingNoteId,
        savedNotesView, setSavedNotesView,
        timelineAccordionExpanded, setTimelineAccordionExpanded,
        activeTimelineFilter, setActiveTimelineFilter,
        gracePeriodActive, setGracePeriodActive,
        gracePeriodEnded, setGracePeriodEnded,
        notificationCount, setNotificationCount,
        notificationPurpose, setNotificationPurpose,
        voluntaryEndOptimistic, setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic,
        summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen,
        summonsPurposeDraft, setSummonsPurposeDraft,
        forcedAttendanceIssued, setForcedAttendanceIssued,
        debtorEvaded, setDebtorEvaded,
        arrestWarrantUnlocked, setArrestWarrantUnlocked,
        creditorAttended, setCreditorAttended,
        executionPaused, setExecutionPaused,
        lastActionDate, setLastActionDate,
        showStatuteWarning, setShowStatuteWarning,
        showExecutionTrashModal, setShowExecutionTrashModal,
        permanentDeleteTimelineId, setPermanentDeleteTimelineId,
    } = useExecutionDashboardWorkspaceLocalUiState(executionData);

    const showUnifiedExecutionModal = modals.showUnifiedExecutionModal;
    const followupOrchestrator = useExecutionFollowupOrchestrator({
        showUnifiedExecutionModal,
        executionData,
        setExecutionModal,
        executionDashboardFileId,
    });

    useExecutionDashboardDebtorTabResetOnFileChange(executionData?.id, followupOrchestrator.setExecutionDebtorTabIndex);

    useExecutionDashboardSummonsPopoverEscapeClose(
        summonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen,
        setSummonsMarkerPopoverOpen,
        setExecutionMemoBadgePopoverOpen,
    );
    useExecutionDashboardExecutionPausedSync(executionData, setExecutionPaused);

    const showUnifiedSummonsModal = modals.showUnifiedSummonsModal;
    const setShowUnifiedSummonsModal = (show: boolean) => setExecutionModal('showUnifiedSummonsModal', show);

    const coercionOrchestrator = useExecutionCoercionOrchestrator(executionFileKey, executionData);
    const dossierLifecyclePanel = useExecutionDossierLifecyclePanelOrchestrator(executionData);

    const [paidDebt, setPaidDebt] = useState<number>(0);
    const paidDebtRef = useRef<number>(paidDebt);
    paidDebtRef.current = paidDebt;
    const [paidCourtFees, setPaidCourtFees] = useState<number>(0);
    const [paidDirectorateFees, setPaidDirectorateFees] = useState<number>(0);
    const [paidClientFees, setPaidClientFees] = useState<number>(0);

    useExecutionDashboardSpecialRequestTemplateMenuDismiss(
        followupOrchestrator.specialRequestTemplateMenuOpen,
        followupOrchestrator.specialRequestTemplateMenuRef,
        followupOrchestrator.setSpecialRequestTemplateMenuOpen,
    );

    useExecutionDashboardPaidClientFeesSync(executionData, setPaidClientFees);

    useExecutionDashboardDossierLifecycleDraftSync({
        executionData,
        setDossierStatusDraft: dossierLifecyclePanel.setDossierStatusDraft,
        setDossierReasonDraft: dossierLifecyclePanel.setDossierReasonDraft,
        setDossierDateDraft: dossierLifecyclePanel.setDossierDateDraft,
    });

    const timelineAssets = useExecutionDashboardTimelineAssetsCluster({
        p,
        coercionOrchestrator: coercionOrchestrator as import('./timelineAssetsClusterHelpers').CoercionBridge,
        setForcedAttendanceIssued,
    });

    const [isPaused, setIsPaused] = useState<boolean>(executionData?.isPaused ?? false);
    const [pauseReason, setPauseReason] = useState<string>(executionData?.pauseReason ?? '');
    const [executionFeeAdded, setExecutionFeeAdded] = useState<boolean>(executionData?.executionFeeAdded ?? false);

    const {
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        showToast,
        hideToast,
        showToastRef,
    } = useToastSystem(executionData?.id, executionId);

    useExecutionDecisionOutcomeToastBridge({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        showUnifiedExecutionModalRef: followupOrchestrator.showUnifiedExecutionModalRef,
        showToastRef,
    });
    useExecutionToastBridge(showToastRef);

    const decisionsOrchestrator = useExecutionDecisionsOrchestrator({
        showDecisionsModal,
        setShowDecisionsModal,
    });
    const {
        decisionsReloadEpoch,
        setDecisionsReloadEpoch,
        decisionsModalBootHubTab,
        setDecisionsModalBootHubTab,
        decisionsModalBootListTab,
        setDecisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
        setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId,
        setAppealsModalScrollToDecisionId,
        clearDecisionsModalBootState,
        openDecisionsModalWithBoot,
    } = decisionsOrchestrator;

    const forcedBringDecisionState = useMemo(
        () => getPersonalCoerciveSubtypeOutcome(executionData?.id ?? executionId, 'forced_bring_in'),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const employeeForcedBringAwaitingPersonalOutcome = useMemo(
        () =>
            Boolean(
                forcedBringDecisionState.approved &&
                    executionData?.forced_bring_in_personal_outcome !== 'brought' &&
                    executionData?.forced_bring_in_personal_outcome !== 'absconded'
            ),
        [forcedBringDecisionState.approved, executionData?.forced_bring_in_personal_outcome]
    );

    const [executionFeeInjected, setExecutionFeeInjected] = useState<boolean>(executionData?.executionFeeInjected || false);

    const financialOrchestrator = useExecutionFinancialOrchestrator({
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
    });

    const {
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    } = financialOrchestrator;

    useExecutionDashboardOpenDecisionsModalBridge({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        executionData: executionData as Record<string, unknown> | null | undefined,
        setShowExecutionFinancialHub,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
        openDecisionsModalWithBoot,
    });

    const { thirdPartySeizuresUi, setThirdPartySeizuresUi, applyThirdPartySeizuresFromPatch } =
        useThirdPartySeizuresUi(executionData);

    useSeizureApprovalToast({
        executionDataId: executionData?.id,
        executionId,
        showToast,
    });

    useExecutionDashboardPerformanceMonitor();

    return {
        todayYmd, noteTitle, setNoteTitle, noteBody, setNoteBody, isTask, setIsTask, taskDueDate, setTaskDueDate,
        taskStatus, setTaskStatus, editingTaskId, setEditingTaskId, editingNoteId, setEditingNoteId, savedNotesView, setSavedNotesView,
        showUnifiedExecutionModal, followupOrchestrator, timelineAccordionExpanded, setTimelineAccordionExpanded,
        activeTimelineFilter, setActiveTimelineFilter, gracePeriodActive, setGracePeriodActive, gracePeriodEnded, setGracePeriodEnded,
        notificationCount, setNotificationCount, notificationPurpose, setNotificationPurpose, voluntaryEndOptimistic, setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic, summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen, summonsPurposeDraft, setSummonsPurposeDraft,
        forcedAttendanceIssued, setForcedAttendanceIssued, debtorEvaded, setDebtorEvaded, arrestWarrantUnlocked, setArrestWarrantUnlocked,
        creditorAttended, executionPaused, setExecutionPaused, showUnifiedSummonsModal, setShowUnifiedSummonsModal,
        coercionOrchestrator, lastActionDate, setLastActionDate, showStatuteWarning, setShowStatuteWarning, dossierLifecyclePanel,
        showExecutionTrashModal, setShowExecutionTrashModal, permanentDeleteTimelineId, setPermanentDeleteTimelineId,
        paidDebt, paidDebtRef, paidCourtFees, setPaidCourtFees, paidDirectorateFees, setPaidDirectorateFees, paidClientFees, setPaidClientFees,
        ...timelineAssets,
        isPaused, setIsPaused, pauseReason, setPauseReason, executionFeeAdded,
        toastVisible, toastMessage, toastType, toastEpoch, showToast, hideToast, showToastRef,
        decisionsOrchestrator, decisionsReloadEpoch, setDecisionsReloadEpoch, decisionsModalBootHubTab, setDecisionsModalBootHubTab,
        decisionsModalBootListTab, setDecisionsModalBootListTab, decisionsModalScrollToDecisionId, setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId, setAppealsModalScrollToDecisionId, clearDecisionsModalBootState, openDecisionsModalWithBoot,
        forcedBringDecisionState, employeeForcedBringAwaitingPersonalOutcome, executionFeeInjected, setExecutionFeeInjected,
        financialOrchestrator, isFinancialCenterExpanded, setIsFinancialCenterExpanded, activeFinancialTab, setActiveFinancialTab,
        showExecutionFinancialHub, setShowExecutionFinancialHub, financialHubAutoOpenMode, setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId, setFinancialHubSeizedMovableId, financialHubSeizedPropertyId, setFinancialHubSeizedPropertyId,
        openFinancialHubLedger, thirdPartySeizuresUi, setThirdPartySeizuresUi, applyThirdPartySeizuresFromPatch,
    };
}
