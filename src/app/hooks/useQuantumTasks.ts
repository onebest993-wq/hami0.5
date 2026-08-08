import { useCallback, useMemo, useRef, useState, type SetStateAction } from 'react';
import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalTask,
    TaskExpenseEntry,
} from '@/app/types/TaskEngine';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';
import { parseTaskInput, startOfLocalDay } from '@/app/utils/nlpParser';
import {
    prepareAgendaTasks,
    isTaskAgendaReadOnly,
    buildPostponeTaskPatch,
    isTaskArchivedToHistory,
} from '@/app/components/lawyer/dashboard/tasksManager/utils';
import {
    applySilentPracticalEnrichment,
    type TaskEnrichmentOptions,
} from '@/app/utils/quantumTaskEnrichment';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import {
    persistTaskVoiceAttachment,
    removeTaskVoiceAttachment,
    titleFromVoicePayload,
} from '@/app/services/tasks/taskVoiceAttachment';
import type { RequestTaskHelpParams } from '@/app/services/taskHelp/quantumTaskHelpActions';

export type AddTaskOptions = TaskEnrichmentOptions;
export type { RequestTaskHelpParams };

function loadQuantumTaskHelpActions() {
    return import('@/app/services/taskHelp/quantumTaskHelpActions');
}

export type UseQuantumTasksOptions = {
    /** يُستدعى داخل updater بعد حساب القائمة الجديدة — قبل إعادة الرسم */
    onTasksCommitted?: (tasks: LegalTask[]) => void;
};

/** حد أمان للنص الخام — يمنع تضخّم التخزين المحلي */
export const MAX_TASK_RAW_LENGTH = 2000;

const EMPTY_TASK_VOICE = {
    voiceRef: null,
    voiceTranscript: null,
    voiceDurationSec: null,
} as const;

function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `qt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

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
        const trimmed = String(rawText ?? '').trim();
        if (!trimmed || trimmed.length > MAX_TASK_RAW_LENGTH) return null;

        const parsed = parseTaskInput(trimmed);
        const enriched = applySilentPracticalEnrichment(trimmed, parsed, options);
        const nextId = newId();
        const next: LegalTask = {
            id: nextId,
            ...enriched,
            linkedCaseId: enriched.linkedCaseId ?? null,
            status: 'pending',
            completedAt: null,
            pinnedToFieldCurtain: false,
            fieldCurtainPinnedAt: null,
            reminderAt: null,
            subTasks: [],
            documentRequirements: [],
            expenses: [],
            ...EMPTY_TASK_VOICE,
        };

        setTasks((prev) => [...prev, next]);
        return next;
    }, [setTasks]);

    const addTaskFromVoice = useCallback(
        async (payload: VoiceNoteSavePayload, fallbackText?: string): Promise<LegalTask | null> => {
            const titleSeed = titleFromVoicePayload(payload, fallbackText);
            if (!titleSeed || titleSeed.length > MAX_TASK_RAW_LENGTH) return null;

            const parsed = parseTaskInput(titleSeed);
            const enriched = applySilentPracticalEnrichment(titleSeed, parsed);
            const nextId = newId();
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
                status: 'pending',
                completedAt: null,
                pinnedToFieldCurtain: false,
                fieldCurtainPinnedAt: null,
                subTasks: [],
                documentRequirements: [],
                expenses: [],
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
        const loc = location.trim();
        let details = '';
        let actionTitles: string[] = [];

        if (typeof mainTitleOrActions === 'string') {
            details = mainTitleOrActions.trim();
        } else {
            actionTitles = mainTitleOrActions.map((x) => x.trim()).filter((x) => x.length > 0);
            details = legacyMainTitle?.trim() ?? '';
        }

        if (!loc || (!details && actionTitles.length === 0)) return;

        const day = startOfLocalDay(scheduledFor);
        const parentTitle = details || actionTitles[0]!;
        const subTasks: LegalSubTask[] = (details ? actionTitles : actionTitles.slice(1)).map((title) => ({
            id: newId(),
            title,
            location: null,
            isCompleted: false,
            kind: 'field',
        }));

        const next: LegalTask = {
            id: newId(),
            rawText: [loc, parentTitle, ...(details ? actionTitles : actionTitles.slice(1))].filter(Boolean).join(' — '),
            title: parentTitle,
            location: loc,
            parsedDate: new Date(day.getTime()),
            reminderAt: null,
            isFatalDeadline: false,
            linkedCaseId: null,
            status: 'pending',
            completedAt: null,
            pinnedToFieldCurtain: false,
            fieldCurtainPinnedAt: null,
            subTasks,
            documentRequirements: [],
            expenses: [],
            ...EMPTY_TASK_VOICE,
        };
        setTasks((prev) => [...prev, next]);
    }, [setTasks]);

    const addSnoozedBacklogTask = useCallback(
        (title: string, reminderAt: Date, location: string | null = null) => {
            const trimmed = title.trim();
            if (!trimmed || trimmed.length > MAX_TASK_RAW_LENGTH) return;
            const parsed = parseTaskInput(trimmed);
            const enriched = applySilentPracticalEnrichment(trimmed, parsed);
            const remind = startOfLocalDay(reminderAt);
            const loc = location?.trim() ? location.trim() : enriched.location;
            const next: LegalTask = {
                id: newId(),
                rawText: trimmed,
                title: enriched.title || trimmed,
                location: loc,
                parsedDate: null,
                reminderAt: new Date(remind.getTime()),
                isFatalDeadline: enriched.isFatalDeadline,
                linkedCaseId: enriched.linkedCaseId,
                status: 'pending',
                completedAt: null,
                pinnedToFieldCurtain: false,
                fieldCurtainPinnedAt: null,
                subTasks: [],
                documentRequirements: [],
                expenses: [],
                ...EMPTY_TASK_VOICE,
            };
            setTasks((prev) => [...prev, next]);
        },
        [setTasks],
    );

    const updateTask = useCallback((id: string, patch: Partial<LegalTask>) => {
        setTasks((prev) =>
            prev.map((t) => {
                if (t.id !== id) return t;
                const next = { ...t, ...patch };
                if (patch.parsedDate !== undefined) {
                    next.parsedDate =
                        patch.parsedDate === null ? null : startOfLocalDay(patch.parsedDate);
                }
                if (patch.reminderAt !== undefined) {
                    next.reminderAt =
                        patch.reminderAt === null ? null : startOfLocalDay(patch.reminderAt);
                }
                return next;
            }),
        );
    }, [setTasks]);

    const deleteTask = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (target?.voiceRef) {
                void removeTaskVoiceAttachment(target.voiceRef);
            }
            return prev.filter((t) => t.id !== id);
        });
    }, [setTasks]);

    const completeTask = useCallback((id: string) => {
        setTasks((prev) => {
            return prepareAgendaTasks(
                prev.map((t) =>
                    t.id === id && !t.completedAt
                        ? {
                              ...t,
                              completedAt: startOfLocalDay(new Date()),
                              pinnedToFieldCurtain: false,
                              fieldCurtainPinnedAt: null,
                          }
                        : t,
                ),
            );
        });
    }, [setTasks]);

    const reopenTask = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (!target?.completedAt || isTaskArchivedToHistory(target, new Date())) return prev;
            return prepareAgendaTasks(
                prev.map((t) => (t.id === id ? { ...t, completedAt: null } : t)),
            );
        });
    }, [setTasks]);

    const postponeTask = useCallback((id: string, targetDate: Date) => {
        const patch = buildPostponeTaskPatch(targetDate);
        setTasks((prev) =>
            prepareAgendaTasks(
                prev.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              ...patch,
                              completedAt: null,
                              status: 'pending' as const,
                          }
                        : t,
                ),
            ),
        );
    }, [setTasks]);

    const toggleTaskFatalDeadline = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, isFatalDeadline: !t.isFatalDeadline } : t,
            ),
        );
    }, [setTasks]);

    const toggleTaskPinnedToFieldCurtain = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (!target) return prev;
            /** الحتمية لها قسمها في الأجندة — لا تُثبَّت على ستارة الميدان */
            if (target.isFatalDeadline) return prev;
            const willPin = !target.pinnedToFieldCurtain;
            const pinDay = startOfLocalDay(new Date());
            return prev.map((t) => {
                if (t.id === id) {
                    return {
                        ...t,
                        pinnedToFieldCurtain: willPin,
                        fieldCurtainPinnedAt: willPin ? new Date(pinDay.getTime()) : null,
                    };
                }
                if (willPin && t.pinnedToFieldCurtain) {
                    return { ...t, pinnedToFieldCurtain: false, fieldCurtainPinnedAt: null };
                }
                return t;
            });
        });
    }, [setTasks]);

    const setTaskLocation = useCallback((id: string, location: string | null) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, location } : t)),
        );
    }, [setTasks]);

    const addSubTask = useCallback((parentId: string, title: string, location: string | null) => {
        const t = title.trim();
        if (!t) return;
        const sub: LegalSubTask = {
            id: newId(),
            title: t,
            location,
            isCompleted: false,
            kind: 'branch',
        };
        setTasks((prev) =>
            prev.map((task) =>
                task.id === parentId ? { ...task, subTasks: [...task.subTasks, sub] } : task,
            ),
        );
    }, [setTasks]);

    const toggleSubTaskComplete = useCallback((parentId: string, subTaskId: string) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== parentId) return task;
                return {
                    ...task,
                    subTasks: task.subTasks.map((st) =>
                        st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st,
                    ),
                };
            }),
        );
    }, [setTasks]);

    const setSubTaskLocation = useCallback(
        (parentId: string, subTaskId: string, location: string | null) => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== parentId) return task;
                    return {
                        ...task,
                        subTasks: task.subTasks.map((st) =>
                            st.id === subTaskId ? { ...st, location } : st,
                        ),
                    };
                }),
            );
        },
        [setTasks],
    );

    const addDocumentRequirement = useCallback((parentId: string, text: string) => {
        const tx = text.trim();
        if (!tx) return;
        const item: DocumentRequirementItem = {
            id: newId(),
            text: tx,
            isChecked: false,
        };
        setTasks((prev) =>
            prev.map((task) =>
                task.id === parentId
                    ? { ...task, documentRequirements: [...task.documentRequirements, item] }
                    : task,
            ),
        );
    }, [setTasks]);

    const toggleDocumentRequirement = useCallback((parentId: string, itemId: string) => {
        setTasks((prev) =>
            prev.map((task) => {
                if (task.id !== parentId) return task;
                return {
                    ...task,
                    documentRequirements: task.documentRequirements.map((d) =>
                        d.id === itemId ? { ...d, isChecked: !d.isChecked } : d,
                    ),
                };
            }),
        );
    }, [setTasks]);

    const addExpense = useCallback((parentId: string, amount: number, label: string) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const entry: TaskExpenseEntry = {
            id: newId(),
            amount,
            label: label.trim() || 'مصروف',
        };
        setTasks((prev) =>
            prev.map((task) =>
                task.id === parentId ? { ...task, expenses: [...task.expenses, entry] } : task,
            ),
        );
    }, [setTasks]);

    const syncHelpFieldsToTask = useCallback(
        async (sourceTaskId: string, help: TaskHelpRequest, extra?: Partial<LegalTask>) => {
            const { helpFieldsPatchFromRequest } = await loadQuantumTaskHelpActions();
            updateTask(sourceTaskId, {
                ...helpFieldsPatchFromRequest(help),
                ...extra,
            });
        },
        [updateTask],
    );

    const requestTaskHelp = useCallback(
        async (params: RequestTaskHelpParams): Promise<TaskHelpRequest | null> => {
            const task = tasksRef.current.find((t) => t.id === params.taskId);
            if (!task) return null;
            const { executeRequestTaskHelp } = await loadQuantumTaskHelpActions();
            const created = await executeRequestTaskHelp(task, params);
            if (created) await syncHelpFieldsToTask(task.id, created);
            return created;
        },
        [syncHelpFieldsToTask],
    );

    const acceptTaskHelp = useCallback(
        async (
            helpRequestId: string,
            colleagueId: string,
            colleagueName?: string,
            sourceTaskId?: string,
        ): Promise<TaskHelpRequest> => {
            const { executeAcceptTaskHelp } = await loadQuantumTaskHelpActions();
            const accepted = await executeAcceptTaskHelp(
                helpRequestId,
                colleagueId,
                colleagueName,
            );
            const taskId = sourceTaskId ?? accepted.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, accepted);
            }
            return accepted;
        },
        [syncHelpFieldsToTask],
    );

    const addSharedTaskNote = useCallback(
        async (
            helpRequestId: string,
            authorId: string,
            noteText: string,
            authorName?: string,
            sourceTaskId?: string,
        ): Promise<TaskHelpRequest> => {
            const { executeAddSharedTaskNote } = await loadQuantumTaskHelpActions();
            const updated = await executeAddSharedTaskNote(
                helpRequestId,
                authorId,
                noteText,
                authorName,
            );
            const taskId = sourceTaskId ?? updated.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, updated);
            }
            return updated;
        },
        [syncHelpFieldsToTask],
    );

    const markHelpCompleted = useCallback(
        async (helpRequestId: string, actorId: string, sourceTaskId?: string) => {
            const { executeMarkHelpCompleted } = await loadQuantumTaskHelpActions();
            const updated = await executeMarkHelpCompleted(helpRequestId, actorId);
            const taskId = sourceTaskId ?? updated.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, updated);
            }
            return updated;
        },
        [syncHelpFieldsToTask],
    );

    const confirmHelpReview = useCallback(
        async (helpRequestId: string, actorId: string, sourceTaskId?: string) => {
            const { executeConfirmHelpReview } = await loadQuantumTaskHelpActions();
            const updated = await executeConfirmHelpReview(helpRequestId, actorId);
            const taskId = sourceTaskId ?? updated.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, updated);
            }
            return updated;
        },
        [syncHelpFieldsToTask],
    );

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
