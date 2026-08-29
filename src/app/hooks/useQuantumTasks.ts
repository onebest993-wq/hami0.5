import { useCallback, useMemo, useRef, useState, type SetStateAction } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { parseTaskInput } from '@/app/utils/nlpParser';
import { prepareAgendaTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import {
    applySilentPracticalEnrichment,
    type TaskEnrichmentOptions,
} from '@/app/utils/quantumTaskEnrichment';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import {
    persistTaskVoiceAttachment,
    titleFromVoicePayload,
} from '@/app/services/tasks/taskVoiceAttachment';
import type { RequestTaskHelpParams } from '@/app/services/taskHelp/quantumTaskHelpActions';
import {
    newTaskId,
    pendingTaskShell,
} from '@/app/services/tasks/quantumPendingTaskFactory';
import {
    buildPendingTaskFromRaw,
    buildSnoozedBacklogTask,
    buildWeeklyLocationBundleTask,
} from '@/app/services/tasks/quantumTaskCreateBuilders';
import { useQuantumTaskNestedMutations } from '@/app/hooks/useQuantumTaskNestedMutations';
import { useQuantumTaskHelpActions } from '@/app/hooks/useQuantumTaskHelpActions';
import { useQuantumTaskLifecycleMutations } from '@/app/hooks/useQuantumTaskLifecycleMutations';
import { MAX_TASK_RAW_LENGTH } from '@/app/services/tasks/taskInputGuard';

export type AddTaskOptions = TaskEnrichmentOptions;
export type { RequestTaskHelpParams };

export type UseQuantumTasksOptions = {
    /** يُستدعى داخل updater بعد حساب القائمة الجديدة — قبل إعادة الرسم */
    onTasksCommitted?: (tasks: LegalTask[]) => void;
};

export { MAX_TASK_RAW_LENGTH } from '@/app/services/tasks/taskInputGuard';

export function useQuantumTasks(initial: LegalTask[] = [], options?: UseQuantumTasksOptions) {
    const onTasksCommittedRef = useRef(options?.onTasksCommitted);
    onTasksCommittedRef.current = options?.onTasksCommitted;

    const [tasks, setTasksState] = useState<LegalTask[]>(() => prepareAgendaTasks(initial));
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

    const addTask = useCallback((rawText: string, options?: AddTaskOptions): LegalTask | null => {
        const next = buildPendingTaskFromRaw(rawText, options);
        if (!next) return null;
        setTasks((prev) => [...prev, next]);
        return next;
    }, [setTasks]);

    const addTaskFromVoice = useCallback(
        async (payload: VoiceNoteSavePayload, fallbackText?: string): Promise<LegalTask | null> => {
            const titleSeed = titleFromVoicePayload(payload, fallbackText);
            if (!titleSeed || titleSeed.length > MAX_TASK_RAW_LENGTH) return null;

            const parsed = parseTaskInput(titleSeed);
            const enriched = applySilentPracticalEnrichment(titleSeed, parsed);
            const nextId = newTaskId();
            const voiceFields = await persistTaskVoiceAttachment(nextId, payload);
            if (!voiceFields) return null;

            const next: LegalTask = {
                id: nextId,
                rawText: titleSeed,
                title: enriched.title || titleSeed,
                location: enriched.location,
                parsedDate: enriched.parsedDate,
                reminderAt: null,
                isFatalDeadline: enriched.isFatalDeadline,
                linkedCaseId: enriched.linkedCaseId ?? null,
                ...pendingTaskShell(),
                ...voiceFields,
            };

            setTasks((prev) => [...prev, next]);
            return next;
        },
        [setTasks],
    );

    const addWeeklyLocationBundle = useCallback((
        scheduledFor: Date,
        location: string,
        mainTitleOrActions: string | string[],
        legacyMainTitle?: string,
    ) => {
        const next = buildWeeklyLocationBundleTask(scheduledFor, location, mainTitleOrActions, legacyMainTitle);
        if (!next) return;
        setTasks((prev) => [...prev, next]);
    }, [setTasks]);

    const addSnoozedBacklogTask = useCallback(
        (title: string, reminderAt: Date, location: string | null = null) => {
            const next = buildSnoozedBacklogTask(title, reminderAt, location);
            if (!next) return;
            setTasks((prev) => [...prev, next]);
        },
        [setTasks],
    );

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
        setSubTaskLocation,
        addDocumentRequirement,
        toggleDocumentRequirement,
        addExpense,
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

    const actions = useMemo(
        () => ({
            addTask,
            addTaskFromVoice,
            addWeeklyLocationBundle,
            addSnoozedBacklogTask,
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
            setSubTaskLocation,
            addDocumentRequirement,
            toggleDocumentRequirement,
            addExpense,
            requestTaskHelp,
            acceptTaskHelp,
            addSharedTaskNote,
            markHelpCompleted,
            confirmHelpReview,
            setTasks,
        }),
        [
            addTask,
            addTaskFromVoice,
            addWeeklyLocationBundle,
            addSnoozedBacklogTask,
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
            setSubTaskLocation,
            addDocumentRequirement,
            toggleDocumentRequirement,
            addExpense,
            requestTaskHelp,
            acceptTaskHelp,
            addSharedTaskNote,
            markHelpCompleted,
            confirmHelpReview,
            setTasks,
        ],
    );

    const data = useMemo(
        () => ({ tasks, pendingTasks, delegatedTasks }),
        [tasks, pendingTasks, delegatedTasks],
    );

    return useMemo(() => ({ ...data, ...actions }), [data, actions]);
}
