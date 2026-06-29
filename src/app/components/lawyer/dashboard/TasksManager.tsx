import React from 'react';
import { History, X } from 'lucide-react';
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

    const bodyStyle =
        keyboardInsetPx > 0
            ? ({ paddingBottom: `${64 + keyboardInsetPx}px` } as React.CSSProperties)
            : undefined;

    return (
        <div className={`${TASKS_PAGE} relative`} role="dialog" aria-modal="true" aria-label="أجندة المهام" data-testid="tasks-manager">
            <TasksManagerModals
                fatalOpen={ctrl.fatalOpen}
                onFatalOpenChange={(open) => {
                    if (!open) ctrl.cancelFatalComplete();
                }}
                onConfirmFatalComplete={ctrl.confirmFatalComplete}
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

            <header className={`${TASKS_HEADER} relative z-[1]`}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#A67C52]/30 to-transparent" />
                <div className="min-w-0 text-right">
                    <h1 className="text-[#E8F5F0] font-extrabold text-xl truncate tracking-tight">أجندة المهام</h1>
                    <p className="text-[10px] text-[#6BC4A8]/55 font-bold mt-0.5">الأسبوع الحالي</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => ctrl.setShowCompletedArchive((v) => !v)}
                        data-testid="tasks-manager-completed-toggle"
                        className={`flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border text-xs font-extrabold transition-all touch-manipulation ${
                            ctrl.showCompletedArchive
                                ? 'border-[#A67C52]/45 bg-[#A67C52]/15 text-[#D4B896]'
                                : `${TASKS_GLASS_PANEL} border-[#A67C52]/20 text-[#E8F5F0]/75 hover:border-[#A67C52]/35 px-3 py-2`
                        }`}
                    >
                        <History size={16} />
                        {ctrl.showCompletedArchive ? 'الأجندة الحالية' : 'المهام المنتهية'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="tasks-manager-close"
                        className="w-11 h-11 rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/72 flex items-center justify-center text-[#E8F5F0]/70 hover:bg-[#0c0c0e]/85 hover:text-[#E8F5F0] hover:border-[#A67C52]/38 touch-manipulation"
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
                        <FatalDeadlinesSection fatalTasks={ctrl.fatalTasks} renderTaskCard={ctrl.renderTaskCard} />

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
                            snoozeTitle={ctrl.snoozeTitle}
                            setSnoozeTitle={ctrl.setSnoozeTitle}
                            snoozeCustomIso={ctrl.snoozeCustomIso}
                            setSnoozeCustomIso={ctrl.setSnoozeCustomIso}
                            applySnoozeChoice={ctrl.applySnoozeChoice}
                            renderTaskCard={ctrl.renderTaskCard}
                        />
                    </>
                )}
            </div>
        </div>
    );
};
