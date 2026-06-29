// @ts-nocheck
/** Phase B — handler cluster party */
import { useMemo, useCallback, useLayoutEffect } from 'react';
import { useExecutionDashboardDebtorEmploymentHandlers } from './useExecutionDashboardDebtorEmploymentHandlers';
import { useExecutionDashboardPersonalCoerciveDecisionSync } from './useExecutionDashboardPersonalCoerciveDecisionSync';
import { useExecutionDashboardEmployeeInvestigationSync } from './useExecutionDashboardEmployeeInvestigationSync';
import { useExecutionDashboardExecutiveDetentionLifecycle } from './useExecutionDashboardExecutiveDetentionLifecycle';
import { useExecutionDashboardStayHandlers } from './useExecutionDashboardStayHandlers';
import { useExecutionDashboardPartyDeathHandlers } from './useExecutionDashboardPartyDeathHandlers';
import { useExecutionDashboardVoluntaryPeriodHandlers } from './useExecutionDashboardVoluntaryPeriodHandlers';
import { useExecutionDashboardEmployeeAssignmentHandlers } from './useExecutionDashboardEmployeeAssignmentHandlers';
import { useExecutionDashboardPublicationNoticeHandlers } from './useExecutionDashboardPublicationNoticeHandlers';
import { useExecutionDashboardNotesTasksHandlers } from './useExecutionDashboardNotesTasksHandlers';
import { useExecutionDashboardAppointmentHandlers } from './useExecutionDashboardAppointmentHandlers';
import { useExecutionDashboardPaymentHandlers } from './useExecutionDashboardPaymentHandlers';
import { useExecutionDashboardNotifyDebtorHandler } from './useExecutionDashboardNotifyDebtorHandler';
import { useExecutionDashboardHeirsNotificationHandlers } from './useExecutionDashboardHeirsNotificationHandlers';
import { useExecutionDashboardDebtorSummonsCoerciveHandlers } from './useExecutionDashboardDebtorSummonsCoerciveHandlers';
import { useExecutionDashboardDecisionsHeirsModalExclusivity } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardHeirsInvestigationSync } from './useExecutionDashboardDecisionAndEventSync';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { HandlerClusterPushTimelineDeps } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterPartyLifecycle(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;

    const {
        absenceBadgeDismissed,
        activeDebtorIsDeceased,
        activeDebtorNameResolved,
        activeDebtorNoticeScope,
        activeFollowupDebtorKey,
        activeWorkspaceDebtorForFollowup,
        alimonyBeneficiaryProfile,
        appointmentDateOnly,
        appointmentPurpose,
        appointmentTimeOptional,
        bindHorizontalWheelToScroll,
        buildDebtorNoticePatchForKey,
        caseNotesLogRef,
        caseTasksPending,
        caseTasksPendingRef,
        claimType,
        closeUnifiedSeizureLog,
        creditorDeathMarked,
        creditors,
        currentFileId,
        debtorBrowserTabsMode,
        debtorDeathMarked,
        debtorNotificationDate,
        debtorSummonsMarkerLocal,
        debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries,
        debtor_absence_badge_dismissed,
        debtors,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        editingAppointmentId,
        editingTaskId,
        employeeForcedBringAwaitingPersonalOutcome,
        evictionGraceAnchorDate,
        executionActionsGridLocked,
        executionData,
        executionDataRef,
        executionId,
        file,
        financialLedger,
        financialLedgerRef,
        forcedBringDecisionState,
        forcedSummoningAnalysis,
        getDebtorNoticeStateForKey,
        heirNoticeDateDrafts,
        heirSubstitutionAllowed,
        isEvictionExecutionModule,
        isTask,
        lastHeirSubRequestAtRef,
        manualGraceCalendarExtra,
        moveCaseTaskToTrash,
        nextTimelineId,
        noteBody,
        noteTitle,
        noticeVoluntaryPeriodEndOptimistic,
        notificationCount,
        notificationPurpose,
        ongoingAlimonyClaim,
        openFollowupModalPersisted,
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDebtRef,
        paidDirectorateFees,
        partyDeathModalDecisionId,
        partyDeathModalParty,
        paymentAmount,
        paymentDate,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        remaining,
        resolveCalendarUserId,
        seizedAssetsSnapshotRef,
        setActiveNoticeState,
        setAlimonyBeneficiaryDeathModalOpen,
        setAlimonyBeneficiaryDeathModalProfile,
        setAppointmentDateOnly,
        setAppointmentPurpose,
        setAppointmentTimeOptional,
        setArrestWarrantUnlocked,
        setCaseNotesLog,
        setCaseTasksPending,
        setDebtorArrested,
        setDebtorAttendedVoluntarily,
        setDebtorEvaded,
        setDebtorForcedToAttend,
        setDebtorNotificationDate,
        setDebtorSummonsMarkerLocal,
        setEarnerFeeCollectionSm,
        setEditingAppointmentId,
        setEditingNoteId,
        setEditingTaskId,
        setExecutionPaused,
        setFinancialLedger,
        setForcedAttendanceIssued,
        setForcedPathAttendanceSecured,
        setHeirNoticeDateDrafts,
        setHeirSummonsDatePickerOpenByHeir,
        setInvestigationCourtRequested,
        setInvestigationMemoIssued,
        setInvestigationPathDebtorPresent,
        setIsTask,
        setLastActionDate,
        setNoteBody,
        setNoteTitle,
        setNoticeVoluntaryPeriodEndOptimistic,
        setNotificationCount,
        setNotificationPurpose,
        setPaidDebt,
        setPartyDeathModalDecisionId,
        setPartyDeathModalParty,
        setPaymentAmount,
        setPaymentDate,
        setShowHeirsNotificationModal,
        setShowNotesModal,
        setShowPaymentModal,
        setSummoningRound,
        setSummonsMarkerPopoverOpen,
        setTaskDueDate,
        setTaskStatus,
        setTimelineEvents,
        setVoluntaryAttendanceCount,
        setVoluntaryEndOptimistic,
        showDecisionsModal,
        showHeirsNotificationModal,
        showToast,
        subsequentNoticeUnlocked,
        summoningRound,
        summonsPurposeDraft,
        taskDueDate,
        taskStatus,
        timelineEventsRef,
        totalOwed,
        totalWithExecutionFee,
        unifiedSummonsTargetDebtorKey,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic,
    } = c as any;

    const debtorEmploymentHandler = useExecutionDashboardDebtorEmploymentHandlers({
        executionDataRef,
        debtorWorkspaceEntries,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });

    const { handleDebtorEmploymentToggle } = debtorEmploymentHandler;

    const exIdForPersonalDecisions = executionData?.id ?? executionId;

    useExecutionDashboardPersonalCoerciveDecisionSync({
        executionData,
        executionId: exIdForPersonalDecisions,
        decisionsReloadEpoch,
        persistExecutionMerge,
        setTimelineEvents,
        nextTimelineId,
    });

    useExecutionDashboardEmployeeInvestigationSync({
        executionData,
        executionId: exIdForPersonalDecisions,
        decisionsReloadEpoch,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    });

    useExecutionDashboardExecutiveDetentionLifecycle({
        executionData,
        persistExecutionMerge,
        showToast,
    });

    const stayHandlers = useExecutionDashboardStayHandlers({
            executionData,
            file,
            currentFileId,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setTimelineEvents,
            setCaseTasksPending,
            setExecutionPaused,
        });

    const { handleLiftStayOfExecution, handleSpecialCasesStay, handleResumeExecution } =
        stayHandlers;

    const partyDeathHandlers = useExecutionDashboardPartyDeathHandlers({
        executionDataRef,
        executionData,
        executionId,
        claimType,
        creditors,
        debtors,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        partyDeathModalParty,
        setPartyDeathModalParty,
        partyDeathModalDecisionId,
        setPartyDeathModalDecisionId,
        setAlimonyBeneficiaryDeathModalProfile,
        setAlimonyBeneficiaryDeathModalOpen,
        lastHeirSubRequestAtRef,
        creditorDeathMarked,
        debtorDeathMarked,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });

const {
        handlePartyDeathSave,
        handleAlimonyBeneficiaryDeathConfirm,
        handleRequestDebtorSubstitution,
        handleRequestCreditorSubstitution,
        handleCreditorDeathMenuAction,
        handleDebtorDeathMenuAction,
        debtorSubstitutionRequestStatus,
        creditorSubstitutionRequestStatus,
    } = partyDeathHandlers;



    const dismissDebtorAbsenceBadge = useCallback(() => {
        if (executionData) {
            if (
                getDebtorNoticeStateForKey(
                    executionData,
                    unifiedSummonsTargetDebtorKey,
                    primaryDebtorKeyResolved
                ).absenceBadgeDismissed
            ) {
                return;
            }
        }
        if (executionData?.id) {
            persistExecutionMerge(
                buildDebtorNoticePatchForKey(
                    executionData,
                    unifiedSummonsTargetDebtorKey,
                    primaryDebtorKeyResolved,
                    { absenceBadgeDismissed: true }
                )
            );
        } else {
            persistExecutionMerge({ debtor_absence_badge_dismissed: true });
        }
        showToast('تم إخفاء إشارة عدم الحضور', 'info');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    ]);

    const voluntaryPeriodHandlers = useExecutionDashboardVoluntaryPeriodHandlers({
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData,
        voluntaryEndOptimistic,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setVoluntaryEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        setTimelineEvents,
        voluntaryAttendanceCount,
        summoningRound,
        setDebtorSummonsMarkerLocal,
        setDebtorAttendedVoluntarily,
        setActiveNoticeState,
        setVoluntaryAttendanceCount,
        setSummoningRound,
        setDebtorNotificationDate,
    });

const {
        handleDeclareEvictionVoluntaryPeriodEnd,
        handleDeclareNoticeVoluntaryPeriodEnd,
        registerDebtorVoluntaryAttendance,
    } = voluntaryPeriodHandlers;



        useLayoutEffect(() => {
        if (!debtorBrowserTabsMode || debtorWorkspaceEntries.length === 0) return;
        const el = debtorWorkspaceChipStripRef.current;
        if (!el) return;
        return bindHorizontalWheelToScroll(el);
    }, [debtorBrowserTabsMode, debtorWorkspaceEntries.length]);

    const employeeAssignmentHandlers = useExecutionDashboardEmployeeAssignmentHandlers({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        forcedBringDecisionState,
        employeeForcedBringAwaitingPersonalOutcome,
    });

const {
        handleEmployeeAssignmentConfirm,
        handleEmployeeAssignmentAttend,
        handleEmployeeAssignmentDeclareAbsent,
        handleEmployeeAssignmentTerminate,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEmployeeAssignmentResolveForcedBringOutcome,
    } = employeeAssignmentHandlers;



    const publicationNoticeHandlers = useExecutionDashboardPublicationNoticeHandlers({
        executionActionsGridLocked,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });

const {
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
    } = publicationNoticeHandlers;



    const notesTasksHandlers = useExecutionDashboardNotesTasksHandlers({
        noteTitle,
        noteBody,
        isTask,
        taskDueDate,
        taskStatus,
        editingTaskId,
        caseTasksPending,
        caseNotesLogRef,
        caseTasksPendingRef,
        timelineEventsRef,
        currentFileId,
        executionData,
        file,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent,
        moveCaseTaskToTrash,
        setNoteTitle,
        setNoteBody,
        setIsTask,
        setTaskDueDate,
        setTaskStatus,
        setEditingTaskId,
        setEditingNoteId,
        setCaseNotesLog,
        setCaseTasksPending,
        setTimelineEvents,
        setShowNotesModal,
        openFollowupModalPersisted,
        closeUnifiedSeizureLog,
    });

    const {
        handleSaveNote,
        commitDossierNote,
        completePendingTask,
        beginEditPendingTask,
        handleSaveTask,
        handleUpdateTask,
        handleDeleteTask,
        handleAddTimelineEvent,
        handleCompleteTask,
        handleMemoFollowupClick,
    } = notesTasksHandlers;

    const voiceUserId = useMemo(() => resolveCalendarUserId(null), []);

    const appointmentHandler = useExecutionDashboardAppointmentHandlers({
        appointmentPurpose,
        appointmentDateOnly,
        appointmentTimeOptional,
        editingAppointmentId,
        timelineEventsRef,
        currentFileId,
        executionData,
        file,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setAppointmentPurpose,
        setAppointmentDateOnly,
        setAppointmentTimeOptional,
        setEditingAppointmentId,
    });

    const { handleSaveAppointment } = appointmentHandler;

    const paymentHandlers = useExecutionDashboardPaymentHandlers({
            executionDataRef,
            executionId,
            executionData,
            paymentAmount,
            paymentDate,
            remaining,
            paidDebt,
            totalOwed,
            totalWithExecutionFee,
            paidCourtFees,
            paidDirectorateFees,
            paidClientFees,
            financialLedger,
            financialLedgerRef,
            paidDebtRef,
            seizedAssetsSnapshotRef,
            nextTimelineId,
            pushTimelineEvent,
            persistExecutionMerge,
            showToast,
            setPaidDebt,
            setFinancialLedger,
            setPaymentAmount,
            setPaymentDate,
            setShowPaymentModal,
        });

    const notifyDebtorHandler = useExecutionDashboardNotifyDebtorHandler({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        notificationPurpose,
        notificationCount,
        subsequentNoticeUnlocked,
        isEvictionExecutionModule,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setDebtorNotificationDate,
        setLastActionDate,
        setActiveNoticeState,
        setNoticeVoluntaryPeriodEndOptimistic,
        setVoluntaryEndOptimistic,
        setNotificationCount,
        setTimelineEvents,
        setDebtorSummonsMarkerLocal,
        setNotificationPurpose,
        setSummonsMarkerPopoverOpen,
    });

    const { handleNotifyDebtor } = notifyDebtorHandler;

    const heirsNotificationHandlers = useExecutionDashboardHeirsNotificationHandlers({
        executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeDebtorIsDeceased,
        heirNoticeDateDrafts,
        decisionsStorageExecutionId,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setHeirNoticeDateDrafts,
        setHeirSummonsDatePickerOpenByHeir,
        setShowHeirsNotificationModal,
    });

const {
        activeDebtorHeirsForNotification,
        heirsWorkflowByHeir,
        normalizeHeirWorkflowKey,
        computeDeadlineYmd,
        computeDaysRemaining,
        openHeirsNotificationCenter,
        issueHeirMemoNotice,
        markHeirMemoAttended,
        closeHeirMemoManually,
        issueHeirSummons,
        requestHeirInvestigationCourt,
        markHeirAttendedAfterInvestigation,
        issueHeirArrestWarrant,
        markHeirSummonsAttended,
        markHeirSummonsPeriodEnded,
    } = heirsNotificationHandlers;



    useExecutionDashboardDecisionsHeirsModalExclusivity(
        showDecisionsModal,
        showHeirsNotificationModal,
        setShowHeirsNotificationModal,
    );
    useExecutionDashboardHeirsInvestigationSync({
        executionData,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        persistExecutionMerge,
    });

    const debtorSummonsCoerciveHandlers = useExecutionDashboardDebtorSummonsCoerciveHandlers({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        forcedSummoningAnalysis,
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
        setForcedAttendanceIssued,
        setActiveNoticeState,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setInvestigationCourtRequested,
        setInvestigationPathDebtorPresent,
        setInvestigationMemoIssued,
        setArrestWarrantUnlocked,
        setDebtorEvaded,
        setDebtorArrested,
        setEarnerFeeCollectionSm,
    });

const {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
        handleForcedAttendance,
        handleEarnerSecureForcedAttendance,
        handleRequestInvestigationFromForced,
        handleInvestigationDebtorShowed,
        handleInvestigationIssueMemo,
        handleConfirmSecuredAfterInvestigation,
        handleDebtorEvasion,
        applyEarnerFeeSmAction,
        resetEarnerFeeNotificationCycle,
        handleArrestWarrant,
    } = debtorSummonsCoerciveHandlers;


    return {
        debtorEmploymentHandler,
        stayHandlers,
        partyDeathHandlers,
        voluntaryPeriodHandlers,
        employeeAssignmentHandlers,
        publicationNoticeHandlers,
        notesTasksHandlers,
        appointmentHandler,
        paymentHandlers,
        notifyDebtorHandler,
        heirsNotificationHandlers,
        debtorSummonsCoerciveHandlers,
    };
}
