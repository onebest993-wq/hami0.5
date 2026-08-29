import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import {
    blockTasksOverlayEscape,
    unblockTasksOverlayEscape,
} from '@/app/components/lawyer/dashboard/fieldTasks/tasksEscapeCoordinator';
import { TasksManagerHeader } from './tasksManager/TasksManagerHeader';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';
import { useQuantumTasksActions } from '@/app/hooks/useQuantumTasksContext';
import { useAuthSafe } from '@/app/context/authHooks';
import { DistantTasksSection } from './tasksManager/DistantTasksSection';
import { FatalDeadlinesSection } from './tasksManager/FatalDeadlinesSection';
import { TasksManagerModals } from './tasksManager/TasksManagerModals';
import { WeeklyAgendaSection } from './tasksManager/WeeklyAgendaSection';
import { CompletedTasksArchiveSection } from './tasksManager/CompletedTasksArchiveSection';
import { useTasksManagerController } from './tasksManager/useTasksManagerController';
import { snoozeAfterDays, dateFromYmdInput } from './tasksManager/utils';
import {
    TASKS_PAGE,
    TASKS_BODY,
} from './tasksManager/tasksBoucleTheme';
import type { ShareScope } from '@/app/types/taskHelpTypes';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';

const LazyRequestHelpModal = lazyWithRetry(() =>
    import('./tasksManager/RequestHelpModal').then((m) => ({
        default: m.RequestHelpModal as LazyComponent,
    })),
);
const LazyTaskHelpInboxPanel = lazyWithRetry(() =>
    import('./tasksManager/TaskHelpInboxPanel').then((m) => ({
        default: m.TaskHelpInboxPanel as LazyComponent,
    })),
);

export type TasksManagerProps = {
    onClose: () => void;
    focusTaskId?: string;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    keyboardInsetPx?: number;
};

export const TasksManager: React.FC<TasksManagerProps> = ({
    onClose,
    focusTaskId,
    lawsuitFiles = [],
    executionFiles = [],
    keyboardInsetPx = 0,
}) => {
    const ctrl = useTasksManagerController({ focusTaskId, lawsuitFiles, executionFiles });
    const { flushPersist } = useQuantumTasksActions();
    const auth = useAuthSafe();
    const userId = auth.user?.id ?? null;
    const userName =
        (auth.user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
        auth.user?.email ||
        'محامٍ';
    const [managerHydrated, setManagerHydrated] = useState(false);
    useTasksLifecycle(true, true, () => setManagerHydrated(true));

    const handleClose = useCallback(() => {
        onClose();
        queueMicrotask(() => {
            void flushPersist();
        });
    }, [flushPersist, onClose]);

    const reduceMotion = useReduceMotion();
    const scrollToTaskCard = useCallback((taskId: string) => {
        const node = document.querySelector(`[data-testid="tasks-task-card-${taskId}"]`);
        if (!(node instanceof HTMLElement)) return;
        node.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        node.focus({ preventScroll: true });
    }, [reduceMotion]);

    const handleRequestHelpSubmit = useCallback(
        async (params: {
            taskId: string;
            scope: ShareScope;
            targetColleagueId?: string;
            targetColleagueName?: string;
            note?: string;
        }) => {
            if (!userId) {
                SmartToast.error('يجب تسجيل الدخول لطلب المساعدة');
                throw new Error('NO_USER');
            }
            const created = await ctrl.requestTaskHelp({
                taskId: params.taskId,
                scope: params.scope,
                requesterId: userId,
                requesterName: userName,
                targetColleagueId: params.targetColleagueId,
                targetColleagueName: params.targetColleagueName,
                note: params.note,
            });
            if (!created) {
                SmartToast.error('تعذر إنشاء طلب المساعدة');
                throw new Error('CREATE_FAILED');
            }
            SmartToast.success(
                params.scope === 'PUBLIC_FORUM'
                    ? 'تم نشر طلب المساعدة العام (بعد التصفية)'
                    : 'تم إرسال طلب المساعدة للزميل',
            );
        },
        [userId, userName, ctrl],
    );

    const syncHelpLocal = useCallback(
        (req: TaskHelpRequest) => {
            void import('@/app/services/taskHelp/quantumTaskHelpActions').then((m) => {
                ctrl.updateTask(req.sourceTaskId, m.helpFieldsPatchFromRequest(req));
            });
        },
        [ctrl],
    );

    const nestedModalOpen =
        ctrl.deleteConfirmId !== null ||
        ctrl.editOpen ||
        ctrl.reminderModalTaskId !== null ||
        ctrl.postponeTaskId !== null ||
        ctrl.helpTarget !== null ||
        ctrl.helpInboxOpen;

    useEffect(() => {
        if (!ctrl.helpInboxOpen && ctrl.helpTarget === null) return;
        blockTasksOverlayEscape('manager-help');
        return () => unblockTasksOverlayEscape('manager-help');
    }, [ctrl.helpInboxOpen, ctrl.helpTarget]);

    const bodyStyle =
        keyboardInsetPx > 0
            ? ({ paddingBottom: `${64 + keyboardInsetPx}px` } as React.CSSProperties)
            : undefined;

    const pageStyle =
        keyboardInsetPx > 0
            ? ({ paddingBottom: `${keyboardInsetPx}px` } as React.CSSProperties)
            : undefined;

    return (
        <div
            className={`${TASKS_PAGE} relative`}
            role="dialog"
            aria-modal={nestedModalOpen ? undefined : true}
            aria-hidden={nestedModalOpen ? true : undefined}
            aria-label="أجندة المهام"
            data-testid="tasks-manager"
            data-tasks-manager-hydrated={managerHydrated ? 'true' : 'false'}
            style={pageStyle}
        >
            <TasksManagerModals
                fatalOpen={ctrl.fatalOpen}
                onFatalOpenChange={ctrl.onFatalOpenChange}
                onConfirmFatalComplete={ctrl.onConfirmFatalComplete}
                deleteConfirmId={ctrl.deleteConfirmId}
                onDismissDelete={() => ctrl.setDeleteConfirmId(null)}
                onConfirmDelete={ctrl.confirmDelete}
                editOpen={ctrl.editOpen}
                onEditOpenChange={(o) => {
                    if (!o) {
                        ctrl.setEditOpen(false);
                        ctrl.setEditTaskId(null);
                        ctrl.setEditSubTasks([]);
                    }
                }}
                onCancelEdit={() => {
                    ctrl.setEditOpen(false);
                    ctrl.setEditTaskId(null);
                    ctrl.setEditSubTasks([]);
                }}
                editTarget={ctrl.editTarget}
                editTitle={ctrl.editTitle}
                onEditTitleChange={ctrl.setEditTitle}
                editLocation={ctrl.editLocation}
                onEditLocationChange={ctrl.setEditLocation}
                editSubTasks={ctrl.editSubTasks}
                onEditSubTaskChange={(subId, patch) => {
                    ctrl.setEditSubTasks((prev) =>
                        prev.map((st) => (st.id === subId ? { ...st, ...patch } : st)),
                    );
                }}
                onRemoveEditSubTask={(subId) => {
                    ctrl.setEditSubTasks((prev) => prev.filter((st) => st.id !== subId));
                }}
                onSaveEdit={ctrl.saveEdit}
                reminderModalTaskId={ctrl.reminderModalTaskId}
                onDismissReminder={() => ctrl.setReminderModalTaskId(null)}
                reminderModalTask={ctrl.reminderModalTask}
                reminderSnoozeCustom={ctrl.reminderSnoozeCustom}
                onReminderSnoozeCustomChange={ctrl.setReminderSnoozeCustom}
                weekStartLive={ctrl.weekStartLive}
                onReminderMoveToDay={(dayDate) => {
                    if (!ctrl.reminderModalTaskId) return;
                    ctrl.updateTask(ctrl.reminderModalTaskId, { parsedDate: dayDate, reminderAt: null });
                    ctrl.setReminderModalTaskId(null);
                }}
                onReminderSnoozeDays={(days) => {
                    if (!ctrl.reminderModalTaskId) return;
                    ctrl.updateTask(ctrl.reminderModalTaskId, { reminderAt: snoozeAfterDays(days) });
                    ctrl.setReminderModalTaskId(null);
                }}
                onReminderSnoozeCustomDate={() => {
                    if (!ctrl.reminderModalTaskId || !ctrl.reminderSnoozeCustom) return;
                    const parsed = dateFromYmdInput(ctrl.reminderSnoozeCustom);
                    if (!parsed) return;
                    ctrl.updateTask(ctrl.reminderModalTaskId, { reminderAt: parsed });
                    ctrl.setReminderSnoozeCustom('');
                    ctrl.setReminderModalTaskId(null);
                }}
                postponeTaskId={ctrl.postponeTaskId}
                onDismissPostpone={ctrl.dismissPostpone}
                postponeTarget={ctrl.postponeTarget}
                postponeDateYmd={ctrl.postponeDateYmd}
                onPostponeDateYmdChange={ctrl.setPostponeDateYmd}
                minPostponeIso={ctrl.minPostponeIso}
                onConfirmPostpone={ctrl.confirmPostpone}
            />

            {ctrl.helpTarget !== null || ctrl.helpInboxOpen ? (
                <Suspense fallback={null}>
                    {ctrl.helpTarget !== null ? (
                        <LazyRequestHelpModal
                            open
                            task={ctrl.helpTarget}
                            userId={userId}
                            userName={userName}
                            onClose={() => ctrl.setHelpTaskId(null)}
                            onSubmit={handleRequestHelpSubmit}
                        />
                    ) : null}
                    {ctrl.helpInboxOpen ? (
                        <LazyTaskHelpInboxPanel
                            open
                            userId={userId}
                            userName={userName}
                            onClose={() => ctrl.setHelpInboxOpen(false)}
                            onAccepted={syncHelpLocal}
                            onUpdated={syncHelpLocal}
                        />
                    ) : null}
                </Suspense>
            ) : null}

            <TasksManagerHeader
                showCompletedArchive={ctrl.showCompletedArchive}
                onOpenHelpInbox={() => ctrl.setHelpInboxOpen(true)}
                onToggleCompletedArchive={() => ctrl.setShowCompletedArchive((v) => !v)}
                onClose={handleClose}
            />

            <div className={`${TASKS_BODY} relative z-[1]`} style={bodyStyle}>
                {ctrl.showCompletedArchive ? (
                    <CompletedTasksArchiveSection
                        tasks={ctrl.tasks}
                        now={ctrl.now}
                        onBack={() => ctrl.setShowCompletedArchive(false)}
                        onReopen={(task) => {
                            ctrl.reopenTask(task.id);
                            ctrl.setShowCompletedArchive(false);
                        }}
                    />
                ) : (
                    <>
                        <FatalDeadlinesSection
                            fatalTasks={ctrl.fatalTasks}
                            onSelectFatalTask={scrollToTaskCard}
                        />

                        <WeeklyAgendaSection
                            weeklyDayBlocks={ctrl.weeklyDayBlocks}
                            weekAdd={ctrl.weekAdd}
                            setWeekAdd={ctrl.setWeekAdd}
                            openWeekAdd={ctrl.openWeekAdd}
                            saveWeekBundle={ctrl.saveWeekBundle}
                            renderTaskCard={ctrl.renderTaskCard}
                            now={ctrl.now}
                        />

                        <DistantTasksSection
                            distantTasks={ctrl.distantTasks}
                            snoozePanelOpen={ctrl.snoozePanelOpen}
                            setSnoozePanelOpen={ctrl.setSnoozePanelOpen}
                            saveSnoozedTask={ctrl.saveSnoozedTask}
                            minSnoozeIso={ctrl.minSnoozeIso}
                            renderTaskCard={ctrl.renderTaskCard}
                            now={ctrl.now}
                        />
                    </>
                )}
            </div>
        </div>
    );
};
