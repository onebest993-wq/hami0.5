import React, { useEffect, useMemo, useState } from 'react';
import { History, X } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useQuantumTasksContext } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { addDays, isSameLocalDay, startOfLocalDay } from '@/app/utils/nlpParser';
import { WORK_WEEK } from './tasksManager/constants';
import { DistantTasksSection } from './tasksManager/DistantTasksSection';
import { FatalDeadlinesSection } from './tasksManager/FatalDeadlinesSection';
import { TaskCard } from './tasksManager/TaskCard';
import { TasksManagerModals, type EditSubTaskDraft } from './tasksManager/TasksManagerModals';
import type { DetailPanel, WeekAddState } from './tasksManager/types';
import {
    dateFromYmdInput,
    getSaturdayOfWeekContaining,
    isTaskInCurrentAgendaWeek,
    snoozeAfterDays,
} from './tasksManager/utils';
import { WeeklyAgendaSection } from './tasksManager/WeeklyAgendaSection';
import { CompletedTasksArchiveSection } from './tasksManager/CompletedTasksArchiveSection';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
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
};

export const TasksManager: React.FC<TasksManagerProps> = ({
    onClose,
    focusTaskId,
    lawsuitFiles = [],
    executionFiles = [],
}) => {
    const {
        tasks,
        pendingTasks,
        addWeeklyLocationBundle,
        addSnoozedBacklogTask,
        updateTask,
        deleteTask,
        completeTask,
        reopenTask,
        toggleTaskFatalDeadline,
        toggleTaskPinnedToFieldCurtain,
        setTaskLocation,
        addSubTask,
        toggleSubTaskComplete,
        setSubTaskLocation,
        addDocumentRequirement,
        toggleDocumentRequirement,
        addExpense,
    } = useQuantumTasksContext();

    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const [weekAdd, setWeekAdd] = useState<WeekAddState>(null);
    const [locationPickFor, setLocationPickFor] = useState<string | null>(null);
    const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);

    const [snoozePanelOpen, setSnoozePanelOpen] = useState(false);
    const [snoozeTitle, setSnoozeTitle] = useState('');
    const [snoozeCustomIso, setSnoozeCustomIso] = useState('');

    const [reminderModalTaskId, setReminderModalTaskId] = useState<string | null>(null);
    const [reminderSnoozeCustom, setReminderSnoozeCustom] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editTaskId, setEditTaskId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editSubTasks, setEditSubTasks] = useState<EditSubTaskDraft[]>([]);

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showCompletedArchive, setShowCompletedArchive] = useState(false);

    useEffect(() => {
        if (!focusTaskId) return;
        const task = pendingTasks.find((t) => t.id === focusTaskId);
        if (task) setDetailPanel({ taskId: focusTaskId, kind: 'brief' });
    }, [focusTaskId, pendingTasks]);

    const fatalTasks = useMemo(() => pendingTasks.filter((t) => t.isFatalDeadline), [pendingTasks]);

    const weeklyDayBlocks = useMemo(() => {
        const weekStart = getSaturdayOfWeekContaining(now);
        return WORK_WEEK.map((d) => {
            const dayDate = addDays(weekStart, d.offset);
            const tasksThisDay = pendingTasks.filter(
                (t) =>
                    !t.isFatalDeadline &&
                    t.parsedDate !== null &&
                    isTaskInCurrentAgendaWeek(t, now) &&
                    isSameLocalDay(t.parsedDate, dayDate),
            );
            return { ...d, dayDate, tasks: tasksThisDay };
        });
    }, [pendingTasks, now]);

    const distantTasks = useMemo(() => {
        const ws = getSaturdayOfWeekContaining(now);
        const we = addDays(ws, 5);
        const wsT = ws.getTime();
        const weT = we.getTime();
        const thisWeekT = ws.getTime();
        return pendingTasks.filter((t) => {
            if (t.isFatalDeadline) return false;
            if (t.parsedDate === null) return true;
            if (!isTaskInCurrentAgendaWeek(t, now)) {
                const taskWeek = getSaturdayOfWeekContaining(t.parsedDate).getTime();
                return taskWeek > thisWeekT;
            }
            const pt = startOfLocalDay(t.parsedDate).getTime();
            return pt < wsT || pt > weT;
        });
    }, [pendingTasks, now]);

    const reminderModalTask = useMemo(
        () => (reminderModalTaskId ? pendingTasks.find((t) => t.id === reminderModalTaskId) ?? null : null),
        [pendingTasks, reminderModalTaskId],
    );

    const editTarget = useMemo(
        () => (editTaskId ? pendingTasks.find((t) => t.id === editTaskId) ?? null : null),
        [pendingTasks, editTaskId],
    );

    const openWeekAdd = (dayKey: (typeof WORK_WEEK)[number]['key']) => {
        setWeekAdd((cur) =>
            cur?.dayKey === dayKey
                ? null
                : { dayKey, step: 'location', location: '', actionLines: [], lineDraft: '' },
        );
    };

    const saveWeekBundle = (dayKey: (typeof WORK_WEEK)[number]['key']) => {
        if (!weekAdd || weekAdd.dayKey !== dayKey || weekAdd.step !== 'actions') return;
        const lines = [...weekAdd.actionLines];
        const last = weekAdd.lineDraft.trim();
        if (last) lines.push(last);
        if (!weekAdd.location.trim() || lines.length === 0) return;
        const weekStart = getSaturdayOfWeekContaining(new Date());
        const d = WORK_WEEK.find((x) => x.key === dayKey);
        if (!d) return;
        const scheduledFor = addDays(weekStart, d.offset);
        addWeeklyLocationBundle(scheduledFor, weekAdd.location.trim(), lines);
        setWeekAdd(null);
    };

    const applySnoozeChoice = (afterDays: number | null, customIso?: string) => {
        const t = snoozeTitle.trim();
        if (!t) return;
        let when: Date;
        if (afterDays !== null) {
            when = snoozeAfterDays(afterDays);
        } else if (customIso) {
            const parsed = dateFromYmdInput(customIso);
            if (!parsed) return;
            when = parsed;
        } else {
            return;
        }
        addSnoozedBacklogTask(t, when, null);
        setSnoozeTitle('');
        setSnoozeCustomIso('');
        setSnoozePanelOpen(false);
    };

    const openEdit = (task: LegalTask) => {
        setEditTaskId(task.id);
        setEditTitle(task.title);
        setEditLocation(task.location ?? '');
        setEditSubTasks(
            task.subTasks.map((st) => ({
                id: st.id,
                title: st.title,
                location: st.location ?? '',
                isCompleted: st.isCompleted,
            })),
        );
        setEditOpen(true);
    };

    const saveEdit = () => {
        if (!editTaskId) return;
        const title = editTitle.trim();
        if (!title) return;
        const loc = editLocation.trim();
        updateTask(editTaskId, {
            title,
            rawText: title,
            location: loc.length > 0 ? loc : null,
            subTasks: editSubTasks
                .map((st) => ({
                    id: st.id,
                    title: st.title.trim(),
                    location: st.location.trim() ? st.location.trim() : null,
                    isCompleted: st.isCompleted,
                }))
                .filter((st) => st.title.length > 0),
        });
        setEditOpen(false);
        setEditTaskId(null);
        setEditSubTasks([]);
    };

    const requestDelete = (task: LegalTask) => {
        setDeleteConfirmId(task.id);
    };

    const confirmDelete = () => {
        if (deleteConfirmId === null) return;
        const id = deleteConfirmId;
        deleteTask(id);
        unpinWorkspaceItem(id, 'task');
        setDeleteConfirmId(null);
        setDetailPanel((p) => (p?.taskId === id ? null : p));
    };

    const renderTaskCard = (t: LegalTask, fatalPulse: boolean, listKey?: string) => (
        <TaskCard
            key={listKey ?? t.id}
            task={t}
            lawsuitFiles={lawsuitFiles}
            executionFiles={executionFiles}
            now={now}
            onCompleteRequest={requestComplete}
            onReopenTask={(t) => reopenTask(t.id)}
            onToggleFatal={toggleTaskFatalDeadline}
            onToggleFieldCurtainPin={toggleTaskPinnedToFieldCurtain}
            onSetLocation={setTaskLocation}
            locationPickFor={locationPickFor}
            onToggleLocationPicker={setLocationPickFor}
            fatalPulse={fatalPulse}
            detailPanel={detailPanel}
            setDetailPanel={setDetailPanel}
            addSubTask={addSubTask}
            toggleSubTaskComplete={toggleSubTaskComplete}
            setSubTaskLocation={setSubTaskLocation}
            addDocumentRequirement={addDocumentRequirement}
            toggleDocumentRequirement={toggleDocumentRequirement}
            addExpense={addExpense}
            onEditRequest={openEdit}
            onDeleteRequest={requestDelete}
            onReminderBadgeClick={(task) => setReminderModalTaskId(task.id)}
        />
    );

    const weekStartLive = getSaturdayOfWeekContaining(new Date());

    return (
        <div className={`${TASKS_PAGE} relative`} role="dialog" aria-modal="true" aria-label="أجندة المهام">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#1A7059]/8 blur-3xl" />
                <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full bg-[#A67C52]/5 blur-3xl" />
            </div>
            <TasksManagerModals
                fatalOpen={fatalOpen}
                onFatalOpenChange={(open) => {
                    if (!open) cancelFatalComplete();
                }}
                onConfirmFatalComplete={confirmFatalComplete}
                deleteConfirmId={deleteConfirmId}
                onDismissDelete={() => setDeleteConfirmId(null)}
                onConfirmDelete={confirmDelete}
                editOpen={editOpen}
                onEditOpenChange={(o) => {
                    if (!o) {
                        setEditOpen(false);
                        setEditTaskId(null);
                        setEditSubTasks([]);
                    }
                }}
                onCancelEdit={() => {
                    setEditOpen(false);
                    setEditTaskId(null);
                    setEditSubTasks([]);
                }}
                editTarget={editTarget}
                editTitle={editTitle}
                onEditTitleChange={setEditTitle}
                editLocation={editLocation}
                onEditLocationChange={setEditLocation}
                editSubTasks={editSubTasks}
                onEditSubTaskChange={(subId, patch) => {
                    setEditSubTasks((prev) =>
                        prev.map((st) => (st.id === subId ? { ...st, ...patch } : st)),
                    );
                }}
                onRemoveEditSubTask={(subId) => {
                    setEditSubTasks((prev) => prev.filter((st) => st.id !== subId));
                }}
                onSaveEdit={saveEdit}
                reminderModalTaskId={reminderModalTaskId}
                onDismissReminder={() => setReminderModalTaskId(null)}
                reminderModalTask={reminderModalTask}
                reminderSnoozeCustom={reminderSnoozeCustom}
                onReminderSnoozeCustomChange={setReminderSnoozeCustom}
                weekStartLive={weekStartLive}
                onReminderMoveToDay={(dayDate) => {
                    if (!reminderModalTaskId) return;
                    updateTask(reminderModalTaskId, { parsedDate: dayDate, reminderAt: null });
                    setReminderModalTaskId(null);
                }}
                onReminderSnoozeDays={(days) => {
                    if (!reminderModalTaskId) return;
                    updateTask(reminderModalTaskId, { reminderAt: snoozeAfterDays(days) });
                    setReminderModalTaskId(null);
                }}
                onReminderSnoozeCustomDate={() => {
                    if (!reminderModalTaskId || !reminderSnoozeCustom) return;
                    const parsed = dateFromYmdInput(reminderSnoozeCustom);
                    if (!parsed) return;
                    updateTask(reminderModalTaskId, { reminderAt: parsed });
                    setReminderSnoozeCustom('');
                    setReminderModalTaskId(null);
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
                        onClick={() => setShowCompletedArchive((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-extrabold transition-all ${
                            showCompletedArchive
                                ? 'border-[#A67C52]/45 bg-[#A67C52]/15 text-[#D4B896]'
                                : `${TASKS_GLASS_PANEL} border-[#A67C52]/20 text-[#E8F5F0]/75 hover:border-[#A67C52]/35 px-3 py-2`
                        }`}
                    >
                        <History size={16} />
                        {showCompletedArchive ? 'الأجندة الحالية' : 'المهام المنتهية'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-11 h-11 rounded-xl border border-[#A67C52]/22 bg-[#0c0c0e]/45 backdrop-blur-md flex items-center justify-center text-[#E8F5F0]/70 hover:bg-[#0c0c0e]/65 hover:text-[#E8F5F0] hover:border-[#A67C52]/38 transition-all"
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                </div>
            </header>

            <div className={`${TASKS_BODY} relative z-[1]`}>
                {showCompletedArchive ? (
                    <CompletedTasksArchiveSection
                        tasks={tasks}
                        now={now}
                        onBack={() => setShowCompletedArchive(false)}
                    />
                ) : (
                    <>
                        <FatalDeadlinesSection fatalTasks={fatalTasks} renderTaskCard={renderTaskCard} />

                <WeeklyAgendaSection
                    weeklyDayBlocks={weeklyDayBlocks}
                    weekAdd={weekAdd}
                    setWeekAdd={setWeekAdd}
                    openWeekAdd={openWeekAdd}
                    saveWeekBundle={saveWeekBundle}
                    renderTaskCard={renderTaskCard}
                />

                <DistantTasksSection
                    distantTasks={distantTasks}
                    snoozePanelOpen={snoozePanelOpen}
                    setSnoozePanelOpen={setSnoozePanelOpen}
                    snoozeTitle={snoozeTitle}
                    setSnoozeTitle={setSnoozeTitle}
                    snoozeCustomIso={snoozeCustomIso}
                    setSnoozeCustomIso={setSnoozeCustomIso}
                    applySnoozeChoice={applySnoozeChoice}
                    renderTaskCard={renderTaskCard}
                />
                    </>
                )}
            </div>
        </div>
    );
};
