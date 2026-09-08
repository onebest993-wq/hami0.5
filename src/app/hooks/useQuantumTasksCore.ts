import { useCallback, useMemo, useRef, useState, type SetStateAction } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useQuantumTaskNestedMutations } from '@/app/hooks/useQuantumTaskNestedMutations';
import { useQuantumTaskHelpActions } from '@/app/hooks/useQuantumTaskHelpActions';
import { useQuantumTaskLifecycleMutations } from '@/app/hooks/useQuantumTaskLifecycleMutations';

export type UseQuantumTasksCoreOptions = {
    /** يُستدعى داخل updater بعد حساب القائمة الجديدة — قبل إعادة الرسم */
    onTasksCommitted?: (tasks: LegalTask[]) => void;
};

export type QuantumTasksCreateFns = {
    addTask: (rawText: string, options?: unknown) => LegalTask | null;
    addTaskFromVoice: (
        payload: import('@/app/components/lawyer/commandCenterTypes').VoiceNoteSavePayload,
        fallbackText?: string,
    ) => Promise<LegalTask | null>;
    addWeeklyLocationBundle: (
        scheduledFor: Date,
        location: string,
        mainTitleOrActions: string | string[],
        legacyMainTitle?: string,
    ) => void;
    addSnoozedBacklogTask: (title: string, reminderAt: Date, location?: string | null) => void;
};

/** حالة + إكمال/فرع/مساعدة — بلا NLP ولا إنشاء من نص */
export function useQuantumTasksCore(initial: LegalTask[] = [], options?: UseQuantumTasksCoreOptions) {
    const onTasksCommittedRef = useRef(options?.onTasksCommitted);
    onTasksCommittedRef.current = options?.onTasksCommitted;

    const [tasks, setTasksState] = useState<LegalTask[]>(initial);
    const tasksRef = useRef(tasks);
    tasksRef.current = tasks;

    const setTasks = useCallback((updater: SetStateAction<LegalTask[]>) => {
        setTasksState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (!Object.is(prev, next)) {
                onTasksCommittedRef.current?.(next);
            }
            return next;
        });
    }, []);

    // TASK_OWNERSHIP_GUARD: updateTask / deleteTask operate only on in-memory session-scoped QuantumTasks.
    // At-Rest persistence is gated by SecureStoreService.ensurePersistedReady() (see QuantumTasksProvider L186).
    // Remote sync via TaskHelpApiService additionally gates requesterId === session userId (see handleRequestHelpSubmit).
    const {
        updateTask,
        deleteTask,
        completeTask,
        reopenTask,
        postponeTask,
        toggleTaskFatalDeadline,
        toggleTaskPinnedToFieldCurtain,
        setTaskLocation,
    } = useQuantumTaskLifecycleMutations(setTasks);

    const {
        requestTaskHelp,
        acceptTaskHelp,
        addSharedTaskNote,
        markHelpCompleted,
        confirmHelpReview,
    } = useQuantumTaskHelpActions(updateTask, tasksRef);

    const {
        addSubTask,
        toggleSubTaskComplete,
        setSubTaskPlanStatus,
        renameSubTask,
        removeSubTask,
        setSubTaskLocation,
        addDocumentRequirement,
        toggleDocumentRequirement,
    } = useQuantumTaskNestedMutations(setTasks);

    const pendingTasks = useMemo(
        () => tasks.filter((t) => t.status === 'pending' || t.status === 'delegated'),
        [tasks],
    );

    const delegatedTasks = useMemo(
        () =>
            tasks.filter(
                (t) =>
                    t.collaborationStatus === 'PENDING' ||
                    t.collaborationStatus === 'ACCEPTED' ||
                    t.collaborationStatus === 'AWAITING_OWNER_REVIEW' ||
                    t.status === 'delegated',
            ),
        [tasks],
    );

    return {
        tasks,
        pendingTasks,
        delegatedTasks,
        setTasks,
        updateTask,
        deleteTask,
        completeTask,
        reopenTask,
        postponeTask,
        toggleTaskFatalDeadline,
        toggleTaskPinnedToFieldCurtain,
        setTaskLocation,
        addSubTask,
        toggleSubTaskComplete,
        setSubTaskPlanStatus,
        renameSubTask,
        removeSubTask,
        setSubTaskLocation,
        addDocumentRequirement,
        toggleDocumentRequirement,
        requestTaskHelp,
        acceptTaskHelp,
        addSharedTaskNote,
        markHelpCompleted,
        confirmHelpReview,
    };
}

export type QuantumTasksCoreValue = ReturnType<typeof useQuantumTasksCore>;

export function useComposedQuantumTasks(
    core: QuantumTasksCoreValue,
    create: QuantumTasksCreateFns,
) {
    const actions = useMemo(
        () => ({
            addTask: create.addTask,
            addTaskFromVoice: create.addTaskFromVoice,
            addWeeklyLocationBundle: create.addWeeklyLocationBundle,
            addSnoozedBacklogTask: create.addSnoozedBacklogTask,
            updateTask: core.updateTask,
            deleteTask: core.deleteTask,
            completeTask: core.completeTask,
            reopenTask: core.reopenTask,
            postponeTask: core.postponeTask,
            toggleTaskFatalDeadline: core.toggleTaskFatalDeadline,
            toggleTaskPinnedToFieldCurtain: core.toggleTaskPinnedToFieldCurtain,
            setTaskLocation: core.setTaskLocation,
            addSubTask: core.addSubTask,
            toggleSubTaskComplete: core.toggleSubTaskComplete,
            setSubTaskPlanStatus: core.setSubTaskPlanStatus,
            renameSubTask: core.renameSubTask,
            removeSubTask: core.removeSubTask,
            setSubTaskLocation: core.setSubTaskLocation,
            addDocumentRequirement: core.addDocumentRequirement,
            toggleDocumentRequirement: core.toggleDocumentRequirement,
            requestTaskHelp: core.requestTaskHelp,
            acceptTaskHelp: core.acceptTaskHelp,
            addSharedTaskNote: core.addSharedTaskNote,
            markHelpCompleted: core.markHelpCompleted,
            confirmHelpReview: core.confirmHelpReview,
            setTasks: core.setTasks,
        }),
        [
            create.addTask,
            create.addTaskFromVoice,
            create.addWeeklyLocationBundle,
            create.addSnoozedBacklogTask,
            core.updateTask,
            core.deleteTask,
            core.completeTask,
            core.reopenTask,
            core.postponeTask,
            core.toggleTaskFatalDeadline,
            core.toggleTaskPinnedToFieldCurtain,
            core.setTaskLocation,
            core.addSubTask,
            core.toggleSubTaskComplete,
            core.setSubTaskPlanStatus,
            core.renameSubTask,
            core.removeSubTask,
            core.setSubTaskLocation,
            core.addDocumentRequirement,
            core.toggleDocumentRequirement,
            core.requestTaskHelp,
            core.acceptTaskHelp,
            core.addSharedTaskNote,
            core.markHelpCompleted,
            core.confirmHelpReview,
            core.setTasks,
        ],
    );

    const data = useMemo(
        () => ({
            tasks: core.tasks,
            pendingTasks: core.pendingTasks,
            delegatedTasks: core.delegatedTasks,
        }),
        [core.tasks, core.pendingTasks, core.delegatedTasks],
    );

    return useMemo(() => ({ ...data, ...actions }), [data, actions]);
}
