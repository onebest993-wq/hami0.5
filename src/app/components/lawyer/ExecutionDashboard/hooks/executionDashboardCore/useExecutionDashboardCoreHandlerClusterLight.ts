// @ts-nocheck
/** Light handler cluster for notes/appointment/payment flows only. */
import { useExecutionDashboardPushTimelineEvent } from './useExecutionDashboardPushTimelineEvent';
import { useExecutionDashboardSupabaseTimelineHydrate } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardNotesTasksHandlers } from './useExecutionDashboardNotesTasksHandlers';
import { useExecutionDashboardAppointmentHandlers } from './useExecutionDashboardAppointmentHandlers';
import { useExecutionDashboardPaymentHandlers } from './useExecutionDashboardPaymentHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterLight(c: ExecutionDashboardCoreHandlerClusterInput) {
    const {
        appointmentDateOnly,
        appointmentPurpose,
        appointmentTimeOptional,
        caseNotesLogRef,
        caseTasksPending,
        caseTasksPendingRef,
        closeUnifiedSeizureLog,
        currentFileId,
        editingAppointmentId,
        editingTaskId,
        executionData,
        executionDataRef,
        executionId,
        file,
        financialLedger,
        financialLedgerRef,
        isTask,
        moveCaseTaskToTrash,
        nextTimelineId,
        noteBody,
        noteTitle,
        openFollowupModalPersisted,
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDebtRef,
        paidDirectorateFees,
        parentDossierId,
        paymentAmount,
        paymentDate,
        persistExecutionMerge,
        pushTimelineEventRef,
        remaining,
        seizedAssetsSnapshotRef,
        setAppointmentDateOnly,
        setAppointmentPurpose,
        setAppointmentTimeOptional,
        setCaseNotesLog,
        setCaseTasksPending,
        setEditingAppointmentId,
        setEditingNoteId,
        setEditingTaskId,
        setFinancialLedger,
        setIsTask,
        setNoteBody,
        setNoteTitle,
        setPaidDebt,
        setPaymentAmount,
        setPaymentDate,
        setShowNotesModal,
        setShowPaymentModal,
        setTaskDueDate,
        setTaskStatus,
        setTimelineEvents,
        showToast,
        taskDueDate,
        taskStatus,
        timelineEventsRef,
        totalOwed,
        totalWithExecutionFee,
    } = c as any;

    const pushTimelineEventBinding = useExecutionDashboardPushTimelineEvent({
        executionId,
        parentDossierId,
        executionDataRef,
        persistExecutionMerge,
        setTimelineEvents,
    });

    const { pushTimelineEvent } = pushTimelineEventBinding;

    if (pushTimelineEventRef) {
        (pushTimelineEventRef as { current?: unknown }).current = pushTimelineEvent;
    }

    useExecutionDashboardSupabaseTimelineHydrate({
        executionDataId: executionData?.id,
        setTimelineEvents,
    });

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

    return {
        pushTimelineEventBinding,
        notesTasksHandlers,
        appointmentHandler,
        paymentHandlers,
    };
}
