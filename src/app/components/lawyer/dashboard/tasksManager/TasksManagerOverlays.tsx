import React, { Suspense } from 'react';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { TasksManagerController } from './useTasksManagerController';
import type { ShareScope } from '@/app/types/taskHelpTypes';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';

const LazyRequestHelpModal = lazyWithRetry(() =>
    import('./RequestHelpModal').then((m) => ({
        default: m.RequestHelpModal as LazyComponent,
    })),
);
const LazyTaskHelpInboxPanel = lazyWithRetry(() =>
    import('./TaskHelpInboxPanel').then((m) => ({
        default: m.TaskHelpInboxPanel as LazyComponent,
    })),
);
const LazyTasksManagerModals = lazyWithRetry(() =>
    import('./TasksManagerModals').then((m) => ({
        default: m.TasksManagerModals as LazyComponent,
    })),
);

export type TasksManagerOverlaysProps = {
    ctrl: TasksManagerController;
    userId: string | null;
    userName: string;
    onRequestHelpSubmit: (params: {
        taskId: string;
        scope: ShareScope;
        targetColleagueId?: string;
        targetColleagueName?: string;
        note?: string;
    }) => Promise<void>;
    syncHelpLocal: (req: TaskHelpRequest) => void;
};

/** تركيب فقط — منطق الإغلاق/التذكير في المتحكّم حتى لا يُعاد إنشاء المعالجات كل رسم */
export function TasksManagerOverlays({
    ctrl,
    userId,
    userName,
    onRequestHelpSubmit,
    syncHelpLocal,
}: TasksManagerOverlaysProps) {
    return (
        <>
            {ctrl.agendaModalsOpen ? (
                <Suspense fallback={null}>
                    <LazyTasksManagerModals
                        fatalOpen={ctrl.fatalOpen}
                        onFatalOpenChange={ctrl.onFatalOpenChange}
                        onConfirmFatalComplete={ctrl.onConfirmFatalComplete}
                        deleteConfirmId={ctrl.deleteConfirmId}
                        onDismissDelete={ctrl.dismissDelete}
                        onConfirmDelete={ctrl.confirmDelete}
                        editOpen={ctrl.editOpen}
                        onEditOpenChange={ctrl.onEditOpenChange}
                        onCancelEdit={ctrl.dismissEdit}
                        editTarget={ctrl.editTarget}
                        editTitle={ctrl.editTitle}
                        onEditTitleChange={ctrl.setEditTitle}
                        editLocation={ctrl.editLocation}
                        onEditLocationChange={ctrl.setEditLocation}
                        editSubTasks={ctrl.editSubTasks}
                        onEditSubTaskChange={ctrl.onEditSubTaskChange}
                        onRemoveEditSubTask={ctrl.onRemoveEditSubTask}
                        onSaveEdit={ctrl.saveEdit}
                        reminderModalTaskId={ctrl.reminderModalTaskId}
                        onDismissReminder={ctrl.dismissReminder}
                        reminderModalTask={ctrl.reminderModalTask}
                        reminderSnoozeCustom={ctrl.reminderSnoozeCustom}
                        onReminderSnoozeCustomChange={ctrl.setReminderSnoozeCustom}
                        weekStartLive={ctrl.weekStartLive}
                        onReminderMoveToDay={ctrl.onReminderMoveToDay}
                        onReminderSnoozeDays={ctrl.onReminderSnoozeDays}
                        onReminderSnoozeCustomDate={ctrl.onReminderSnoozeCustomDate}
                        postponeTaskId={ctrl.postponeTaskId}
                        onDismissPostpone={ctrl.dismissPostpone}
                        postponeTarget={ctrl.postponeTarget}
                        postponeDateYmd={ctrl.postponeDateYmd}
                        onPostponeDateYmdChange={ctrl.setPostponeDateYmd}
                        minPostponeIso={ctrl.minPostponeIso}
                        onConfirmPostpone={ctrl.confirmPostpone}
                    />
                </Suspense>
            ) : null}

            {ctrl.helpTarget !== null || ctrl.helpInboxOpen ? (
                <Suspense fallback={null}>
                    {ctrl.helpTarget !== null ? (
                        <LazyRequestHelpModal
                            open
                            task={ctrl.helpTarget}
                            userId={userId}
                            userName={userName}
                            onClose={ctrl.closeHelpModal}
                            onSubmit={onRequestHelpSubmit}
                        />
                    ) : null}
                    {ctrl.helpInboxOpen ? (
                        <LazyTaskHelpInboxPanel
                            open
                            userId={userId}
                            userName={userName}
                            onClose={ctrl.closeHelpInbox}
                            onAccepted={syncHelpLocal}
                            onUpdated={syncHelpLocal}
                        />
                    ) : null}
                </Suspense>
            ) : null}
        </>
    );
}
