import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, X } from 'lucide-react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useQuantumTasksContext } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { addDays, isSameLocalDay, startOfLocalDay } from '@/app/utils/nlpParser';
import { WORK_WEEK } from './tasksManager/constants';
import { DistantTasksSection } from './tasksManager/DistantTasksSection';
import { FatalDeadlinesSection } from './tasksManager/FatalDeadlinesSection';
import { TaskCard } from './tasksManager/TaskCard';
import { TasksManagerModals } from './tasksManager/TasksManagerModals';
import type { DetailPanel, WeekAddState } from './tasksManager/types';
import {
    dateFromYmdInput,
    getSaturdayOfWeekContaining,
    snoozeAfterDays,
} from './tasksManager/utils';
import { WeeklyAgendaSection } from './tasksManager/WeeklyAgendaSection';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';

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
        pendingTasks,
        addWeeklyLocationBundle,
        addSnoozedBacklogTask,
        updateTask,
        deleteTask,
        completeTask,
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

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        if (!focusTaskId) return;
        const task = pendingTasks.find((t) => t.id === focusTaskId);
        if (task) setDetailPanel({ taskId: focusTaskId, kind: 'brief' });
    }, [focusTaskId, pendingTasks]);

    const fatalTasks = useMemo(() => pendingTasks.filter((t) => t.isFatalDeadline), [pendingTasks]);

    const weeklyDayBlocks = useMemo(() => {
        const weekStart = getSaturdayOfWeekContaining(new Date());
        return WORK_WEEK.map((d) => {
            const dayDate = addDays(weekStart, d.offset);
            const tasksThisDay = pendingTasks.filter(
                (t) =>
                    !t.isFatalDeadline &&
                    t.parsedDate !== null &&
                    isSameLocalDay(t.parsedDate, dayDate),
            );
            return { ...d, dayDate, tasks: tasksThisDay };
        });
    }, [pendingTasks]);

    const distantTasks = useMemo(() => {
        const ws = getSaturdayOfWeekContaining(new Date());
        const we = addDays(ws, 5);
        const wsT = ws.getTime();
        const weT = we.getTime();
        return pendingTasks.filter((t) => {
            if (t.isFatalDeadline) return false;
            if (t.parsedDate === null) return true;
            const pt = startOfLocalDay(t.parsedDate).getTime();
            return pt < wsT || pt > weT;
        });
    }, [pendingTasks]);

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
        });
        setEditOpen(false);
        setEditTaskId(null);
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
            onToggleFatal={toggleTaskFatalDeadline}
            onTogglePin={toggleTaskPinnedToFieldCurtain}
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
        <div className="fixed inset-0 z-[220] flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 font-['Tajawal','Cairo',sans-serif]">
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
                    }
                }}
                onCancelEdit={() => {
                    setEditOpen(false);
                    setEditTaskId(null);
                }}
                editTarget={editTarget}
                editTitle={editTitle}
                onEditTitleChange={setEditTitle}
                editLocation={editLocation}
                onEditLocationChange={setEditLocation}
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

            <header className="shrink-0 border-b border-slate-800/80 px-5 py-5 flex items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0 flex-row-reverse">
                    <div className="w-12 h-12 rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-md flex items-center justify-center text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <ClipboardList size={24} />
                    </div>
                    <div className="min-w-0 text-right">
                        <h1 className="text-slate-50 font-extrabold text-xl truncate tracking-tight">أجندة المهام</h1>
                        <p className="text-slate-500 text-xs font-medium mt-1">
                            مخطط أسبوعي وتخطيط لاحق — موحّد مع ستارة الميدان
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 w-11 h-11 rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-md flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all"
                    aria-label="إغلاق"
                >
                    <X size={22} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 pb-16 max-w-3xl mx-auto w-full space-y-10">
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
            </div>
        </div>
    );
};
