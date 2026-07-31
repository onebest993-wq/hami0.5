import React, { Suspense, useCallback, useState } from 'react';
import { HandHelping, History, X } from 'lucide-react';
import { useTasksLifecycle } from '@/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle';
import { useQuantumTasksActions } from '@/app/hooks/useQuantumTasksContext';
import { useAuthSafe } from '@/app/context/AuthContext';
import { DistantTasksSection } from './tasksManager/DistantTasksSection';
import { FatalDeadlinesSection } from './tasksManager/FatalDeadlinesSection';
import { TasksManagerModals } from './tasksManager/TasksManagerModals';
import { WeeklyAgendaSection } from './tasksManager/WeeklyAgendaSection';
import { CompletedTasksArchiveSection } from './tasksManager/CompletedTasksArchiveSection';
import { useTasksManagerController } from './tasksManager/useTasksManagerController';
import { snoozeAfterDays, dateFromYmdInput } from './tasksManager/utils';
import {
    TASKS_PAGE,
    TASKS_HEADER,
    TASKS_BODY,
    TASKS_GLASS_PANEL,
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
        ctrl.helpTarget !== null ||
        ctrl.helpInboxOpen;

    const bodyStyle =
        keyboardInsetPx > 0
            ? ({ paddingBottom: `${64 + keyboardInsetPx}px` } as React.CSSProperties)
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

            <header className={`${TASKS_HEADER} relative z-[1]`}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#A67C52]/30 to-transparent" />
                <div className="min-w-0 text-right">
                    <h1 className="text-[#E8F5F0] font-extrabold text-xl truncate tracking-tight">أجندة المهام</h1>
                    <p className="text-[10px] text-[#D4B896]/55 font-bold mt-0.5">الأسبوع الحالي</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 max-w-[62%]">
                    <button
                        type="button"
                        onClick={() => ctrl.setHelpInboxOpen(true)}
                        data-testid="tasks-manager-help-inbox"
                        className={`flex items-center gap-1 min-h-[44px] px-2.5 py-2 rounded-xl border text-[11px] font-extrabold transition-all touch-manipulation ${TASKS_GLASS_PANEL} border-[#A67C52]/20 text-[#E8F5F0]/75 hover:border-[#A67C52]/35`}
                        aria-label="صندوق طلبات المساعدة"
                    >
                        <HandHelping size={15} />
                        مساعدة
                    </button>
                    <button
                        type="button"
                        onClick={() => ctrl.setShowCompletedArchive((v) => !v)}
                        data-testid="tasks-manager-completed-toggle"
                        className={`flex items-center gap-1 min-h-[44px] px-2.5 py-2 rounded-xl border text-[11px] font-extrabold transition-all touch-manipulation ${
                            ctrl.showCompletedArchive
                                ? 'border-[#A67C52]/45 bg-[#A67C52]/15 text-[#D4B896]'
                                : `${TASKS_GLASS_PANEL} border-[#A67C52]/20 text-[#E8F5F0]/75 hover:border-[#A67C52]/35`
                        }`}
                    >
                        <History size={15} />
                        {ctrl.showCompletedArchive ? 'الأجندة' : 'المنتهية'}
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        data-testid="tasks-manager-close"
                        className="w-11 h-11 shrink-0 rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/72 flex items-center justify-center text-[#E8F5F0]/70 hover:bg-[#0c0c0e]/85 hover:text-[#E8F5F0] hover:border-[#A67C52]/38 touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                </div>
            </header>

            <div className={`${TASKS_BODY} relative z-[1]`} style={bodyStyle}>
                {ctrl.showCompletedArchive ? (
                    <CompletedTasksArchiveSection
                        tasks={ctrl.tasks}
                        now={ctrl.now}
                        onBack={() => ctrl.setShowCompletedArchive(false)}
                    />
                ) : (
                    <>
                        <FatalDeadlinesSection fatalTasks={ctrl.fatalTasks} />

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
