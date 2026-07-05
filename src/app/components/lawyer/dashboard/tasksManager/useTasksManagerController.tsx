import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useQuantumTasksActions, useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import { useFatalTaskComplete } from '@/app/hooks/useFatalTaskComplete';
import { addDays, isSameLocalDay, startOfLocalDay } from '@/app/utils/nlpParser';
import { WORK_WEEK, WORK_WEEK_LAST_OFFSET } from './constants';
import { TaskCard } from './TaskCard';
import type { TaskListOrdinal } from './TaskListOrdinalBadge';
import type { EditSubTaskDraft } from './TasksManagerModals';
import type { DetailPanel, WeekAddState } from './types';
import {
    dateFromYmdInput,
    formatLocalYmdInput,
    getSaturdayOfWeekContaining,
    isDeferredSnoozedTask,
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
        addSubTask,
        toggleSubTaskComplete,
        addDocumentRequirement,
        toggleDocumentRequirement,
    } = quantumActions;

    const { fatalOpen, requestComplete, confirmFatalComplete, cancelFatalComplete } =
        useFatalTaskComplete(completeTask);

    const now = useAgendaNow();

    const [weekAdd, setWeekAdd] = useState<WeekAddState>(null);
    const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);

    const [snoozePanelOpen, setSnoozePanelOpen] = useState(false);

    const minSnoozeIso = useMemo(() => formatLocalYmdInput(now), [now]);

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
        const task = tasks.find((t) => t.id === focusTaskId);
        if (task) setDetailPanel({ taskId: focusTaskId, kind: 'brief' });
    }, [focusTaskId, tasks]);

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
        const we = addDays(ws, WORK_WEEK_LAST_OFFSET);
        const wsT = ws.getTime();
        const weT = we.getTime();
        const thisWeekT = ws.getTime();
        return pendingTasks.filter((t) => {
            if (t.isFatalDeadline) return false;
            if (isDeferredSnoozedTask(t, now)) return true;
            if (t.parsedDate === null) return false;
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
                    : { dayKey, details: '', location: '' },
            );
        },
        [now],
    );

    const saveWeekBundle = useCallback(
        (dayKey: (typeof WORK_WEEK)[number]['key']) => {
            if (!weekAdd || weekAdd.dayKey !== dayKey) return;
            const details = weekAdd.details.trim();
            const location = weekAdd.location.trim();
            if (!location || !details) return;
            const weekStart = getSaturdayOfWeekContaining(now);
            const d = WORK_WEEK.find((x) => x.key === dayKey);
            if (!d) return;
            const scheduledFor = addDays(weekStart, d.offset);
            addWeeklyLocationBundle(scheduledFor, location, details);
            setWeekAdd(null);
        },
        [weekAdd, now, addWeeklyLocationBundle],
    );

    const saveSnoozedTask = useCallback(
        (title: string, ymd: string) => {
            const trimmed = title.trim();
            const when = dateFromYmdInput(ymd);
            if (!trimmed || !when) return;
            if (startOfLocalDay(when).getTime() < startOfLocalDay(now).getTime()) {
                SmartToast.error('اختر تاريخ القيام من اليوم فما بعد');
                return;
            }
            addSnoozedBacklogTask(trimmed, when, null);
            SmartToast.success('تم حفظ المهمة المؤجلة');
        },
        [now, addSnoozedBacklogTask],
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
        const details = editTitle.trim();
        const loc = editLocation.trim();
        if (!details && !loc) {
            SmartToast.error('أدخل تفاصيل المهمة أو الموقع على الأقل');
            return;
        }
        const prevTask = tasks.find((t) => t.id === editTaskId);
        const nextTitle = details || loc;
        updateTask(editTaskId, {
            title: nextTitle,
            rawText: [loc, details].filter(Boolean).join(' — '),
            location: loc.length > 0 ? loc : null,
            subTasks: editSubTasks
                .map((st) => {
                    const prevSub = prevTask?.subTasks.find((s) => s.id === st.id);
                    return {
                        id: st.id,
                        title: st.title.trim(),
                        location: st.location.trim() ? st.location.trim() : null,
                        isCompleted: st.isCompleted,
                        kind: prevSub?.kind,
                    };
                })
                .filter((st) => st.title.length > 0),
        });
        setEditOpen(false);
        setEditTaskId(null);
        setEditSubTasks([]);
    }, [editTaskId, editTitle, editLocation, editSubTasks, tasks, updateTask]);

    const confirmDelete = useCallback(() => {
        let removedId: string | null = null;
        setDeleteConfirmId((currentId) => {
            if (currentId === null) return null;
            removedId = currentId;
            deleteTask(currentId);
            unpinWorkspaceItem(currentId, 'task');
            return null;
        });
        if (removedId !== null) {
            setDetailPanel((panel) => (panel?.taskId === removedId ? null : panel));
        }
    }, [deleteTask]);

    const toggleFieldCurtainPin = useCallback(
        (id: string) => {
            toggleTaskPinnedToFieldCurtain(id);
        },
        [toggleTaskPinnedToFieldCurtain],
    );

    const renderTaskCard = useCallback(
        (t: LegalTask, fatalPulse: boolean, listOrdinal?: TaskListOrdinal, listKey?: string) => (
            <TaskCard
                key={listKey ?? t.id}
                task={t}
                listOrdinal={listOrdinal}
                lawsuitFiles={lawsuitFiles}
                executionFiles={executionFiles}
                now={now}
                onCompleteRequest={requestComplete}
                onReopenTask={(task) => reopenTask(task.id)}
                onToggleFatal={toggleTaskFatalDeadline}
                onToggleFieldCurtainPin={toggleFieldCurtainPin}
                fatalPulse={fatalPulse}
                detailPanel={detailPanel}
                setDetailPanel={setDetailPanel}
                addSubTask={addSubTask}
                toggleSubTaskComplete={toggleSubTaskComplete}
                addDocumentRequirement={addDocumentRequirement}
                toggleDocumentRequirement={toggleDocumentRequirement}
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
            toggleFieldCurtainPin,
            detailPanel,
            addSubTask,
            toggleSubTaskComplete,
            addDocumentRequirement,
            toggleDocumentRequirement,
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
        saveSnoozedTask,
        minSnoozeIso,
        requestDelete,
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
