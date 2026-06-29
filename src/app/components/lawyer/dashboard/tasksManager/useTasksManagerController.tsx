import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useQuantumTasksActions, useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { addDays, isSameLocalDay, startOfLocalDay } from '@/app/utils/nlpParser';
import { WORK_WEEK } from './constants';
import { TaskCard } from './TaskCard';
import type { EditSubTaskDraft } from './TasksManagerModals';
import type { DetailPanel, WeekAddState } from './types';
import {
    dateFromYmdInput,
    getSaturdayOfWeekContaining,
    isTaskInCurrentAgendaWeek,
    snoozeAfterDays,
} from './utils';
import { useAgendaNow } from './useAgendaNow';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';

export type UseTasksManagerControllerOptions = {
    focusTaskId?: string;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
};

export function useTasksManagerController({
    focusTaskId,
    lawsuitFiles = [],
    executionFiles = [],
}: UseTasksManagerControllerOptions) {
    const { tasks, pendingTasks } = useQuantumTasksData();
    const quantumActions = useQuantumTasksActions();
    const {
        addTask,
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
    } = quantumActions;

    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const now = useAgendaNow();

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

    const openWeekAdd = useCallback(
        (dayKey: (typeof WORK_WEEK)[number]['key']) => {
            const weekStart = getSaturdayOfWeekContaining(now);
            const d = WORK_WEEK.find((x) => x.key === dayKey);
            if (d) {
                const dayDate = addDays(weekStart, d.offset);
                if (dayDate.getTime() < startOfLocalDay(now).getTime()) return;
            }
            setWeekAdd((cur) =>
                cur?.dayKey === dayKey
                    ? null
                    : { dayKey, details: '', location: '', actionLines: [], lineDraft: '' },
            );
        },
        [now],
    );

    const saveWeekBundle = useCallback(
        (dayKey: (typeof WORK_WEEK)[number]['key']) => {
            if (!weekAdd || weekAdd.dayKey !== dayKey) return;
            const lines = [...weekAdd.actionLines];
            const last = weekAdd.lineDraft.trim();
            if (last) lines.push(last);
            const details = weekAdd.details.trim();
            const location = weekAdd.location.trim();
            if (!location || (!details && lines.length === 0)) return;
            const weekStart = getSaturdayOfWeekContaining(now);
            const d = WORK_WEEK.find((x) => x.key === dayKey);
            if (!d) return;
            const scheduledFor = addDays(weekStart, d.offset);
            addWeeklyLocationBundle(scheduledFor, location, lines, details || undefined);
            setWeekAdd(null);
        },
        [weekAdd, now, addWeeklyLocationBundle],
    );

    const applySnoozeChoice = useCallback(
        (afterDays: number | null, customIso?: string) => {
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
        },
        [snoozeTitle, addSnoozedBacklogTask],
    );

    const openEdit = useCallback((task: LegalTask) => {
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
    }, []);

    const requestDelete = useCallback((task: LegalTask) => {
        setDeleteConfirmId(task.id);
    }, []);

    const saveEdit = useCallback(() => {
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
    }, [editTaskId, editTitle, editLocation, editSubTasks, updateTask]);

    const confirmDelete = useCallback(() => {
        if (deleteConfirmId === null) return;
        const id = deleteConfirmId;
        deleteTask(id);
        unpinWorkspaceItem(id, 'task');
        setDeleteConfirmId(null);
        setDetailPanel((p) => (p?.taskId === id ? null : p));
    }, [deleteConfirmId, deleteTask]);

    const renderTaskCard = useCallback(
        (t: LegalTask, fatalPulse: boolean, listKey?: string) => (
            <TaskCard
                key={listKey ?? t.id}
                task={t}
                lawsuitFiles={lawsuitFiles}
                executionFiles={executionFiles}
                now={now}
                onCompleteRequest={requestComplete}
                onReopenTask={(task) => reopenTask(task.id)}
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
        ),
        [
            lawsuitFiles,
            executionFiles,
            now,
            requestComplete,
            reopenTask,
            toggleTaskFatalDeadline,
            toggleTaskPinnedToFieldCurtain,
            setTaskLocation,
            locationPickFor,
            detailPanel,
            addSubTask,
            toggleSubTaskComplete,
            setSubTaskLocation,
            addDocumentRequirement,
            toggleDocumentRequirement,
            addExpense,
            openEdit,
            requestDelete,
        ],
    );

    const weekStartLive = getSaturdayOfWeekContaining(new Date());

    return {
        tasks,
        now,
        addTask,
        fatalTasks,
        weeklyDayBlocks,
        distantTasks,
        weekAdd,
        setWeekAdd,
        openWeekAdd,
        saveWeekBundle,
        snoozePanelOpen,
        setSnoozePanelOpen,
        snoozeTitle,
        setSnoozeTitle,
        snoozeCustomIso,
        setSnoozeCustomIso,
        applySnoozeChoice,
        renderTaskCard,
        showCompletedArchive,
        setShowCompletedArchive,
        weekStartLive,
        fatalOpen,
        cancelFatalComplete,
        confirmFatalComplete,
        deleteConfirmId,
        setDeleteConfirmId,
        confirmDelete,
        editOpen,
        setEditOpen,
        setEditTaskId,
        setEditSubTasks,
        editTarget,
        editTitle,
        setEditTitle,
        editLocation,
        setEditLocation,
        editSubTasks,
        saveEdit,
        reminderModalTaskId,
        setReminderModalTaskId,
        reminderModalTask,
        reminderSnoozeCustom,
        setReminderSnoozeCustom,
        updateTask,
    };
}
