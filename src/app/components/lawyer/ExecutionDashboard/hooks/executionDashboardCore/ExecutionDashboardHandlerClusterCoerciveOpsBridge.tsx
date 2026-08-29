import { useMemo } from 'react';
import {
    collectFullHandlerClusterContext,
    type HandlerClusterContextSpreads,
} from './handlerClusterContextShared';
import { useExecutionDashboardCoreHandlerClusterCoerciveFoundation } from './useExecutionDashboardCoreHandlerClusterCoerciveFoundation';
import { useExecutionDashboardNotesTasksHandlers } from './useExecutionDashboardNotesTasksHandlers';
import { useExecutionDashboardAppointmentHandlers } from './useExecutionDashboardAppointmentHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

export type ExecutionDashboardHandlerClusterCoerciveOpsBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterCoerciveOpsBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterCoerciveOpsBridgeProps) {
    const c = collectFullHandlerClusterContext(input as HandlerClusterContextSpreads);
    const { pushTimelineEventBinding, pushTimelineEvent } =
        useExecutionDashboardCoreHandlerClusterCoerciveFoundation(c);

    const notesTasksHandlers = useExecutionDashboardNotesTasksHandlers({
        noteTitle: c.noteTitle,
        noteBody: c.noteBody,
        isTask: c.isTask,
        taskDueDate: c.taskDueDate,
        taskStatus: c.taskStatus,
        editingTaskId: c.editingTaskId,
        caseTasksPending: c.caseTasksPending,
        caseNotesLogRef: c.caseNotesLogRef,
        caseTasksPendingRef: c.caseTasksPendingRef,
        timelineEventsRef: c.timelineEventsRef,
        currentFileId: c.currentFileId,
        executionData: c.executionData,
        file: c.file,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        pushTimelineEvent,
        moveCaseTaskToTrash: c.moveCaseTaskToTrash,
        setNoteTitle: c.setNoteTitle,
        setNoteBody: c.setNoteBody,
        setIsTask: c.setIsTask,
        setTaskDueDate: c.setTaskDueDate,
        setTaskStatus: c.setTaskStatus,
        setEditingTaskId: c.setEditingTaskId,
        setEditingNoteId: c.setEditingNoteId,
        setCaseNotesLog: c.setCaseNotesLog,
        setCaseTasksPending: c.setCaseTasksPending,
        setTimelineEvents: c.setTimelineEvents,
        setShowNotesModal: c.setShowNotesModal,
        openFollowupModalPersisted: c.openFollowupModalPersisted,
        closeUnifiedSeizureLog: c.closeUnifiedSeizureLog,
    });

    const voiceUserId = useMemo(
        () =>
            typeof c.resolveCalendarUserId === 'function'
                ? c.resolveCalendarUserId(null)
                : (c.voiceUserId ?? null),
        [c.resolveCalendarUserId, c.voiceUserId],
    );
    void voiceUserId;

    const appointmentHandler = useExecutionDashboardAppointmentHandlers({
        appointmentPurpose: c.appointmentPurpose,
        appointmentDateOnly: c.appointmentDateOnly,
        appointmentTimeOptional: c.appointmentTimeOptional,
        editingAppointmentId: c.editingAppointmentId,
        timelineEventsRef: c.timelineEventsRef,
        currentFileId: c.currentFileId,
        executionData: c.executionData,
        file: c.file,
        nextTimelineId: c.nextTimelineId,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setTimelineEvents: c.setTimelineEvents,
        setAppointmentPurpose: c.setAppointmentPurpose,
        setAppointmentDateOnly: c.setAppointmentDateOnly,
        setAppointmentTimeOptional: c.setAppointmentTimeOptional,
        setEditingAppointmentId: c.setEditingAppointmentId,
    });

    const cluster = useMemo(
        () => ({
            pushTimelineEventBinding,
            pushTimelineEvent,
            notesTasksHandlers,
            appointmentHandler,
        }),
        [appointmentHandler, notesTasksHandlers, pushTimelineEvent, pushTimelineEventBinding],
    );

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        [
            ...handlerBagKeyFingerprint(
                cluster.pushTimelineEventBinding as Record<string, unknown> | undefined,
            ),
            ...handlerBagKeyFingerprint(
                cluster.notesTasksHandlers as Record<string, unknown> | undefined,
            ),
            ...handlerBagKeyFingerprint(
                cluster.appointmentHandler as Record<string, unknown> | undefined,
            ),
        ],
        onCluster,
    );

    return null;
}
