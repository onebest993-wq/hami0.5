import { useCallback, useMemo, useRef, useState, type SetStateAction } from 'react';
import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalTask,
    TaskExpenseEntry,
} from '@/app/types/TaskEngine';
import { addDays, parseTaskInput, startOfLocalDay } from '@/app/utils/nlpParser';
import { prepareAgendaTasks, isTaskAgendaReadOnly } from '@/app/components/lawyer/dashboard/tasksManager/utils';
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

export type AddTaskOptions = TaskEnrichmentOptions;

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
        const linkedCaseId = enriched.linkedCaseId ?? null;
        const next: LegalTask = {
            id: nextId,
            ...enriched,
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
    }, []);

    const addTaskFromVoice = useCallback(
        async (payload: VoiceNoteSavePayload, fallbackText?: string): Promise<LegalTask | null> => {
            const titleSeed = titleFromVoicePayload(payload, fallbackText);
            if (!titleSeed || titleSeed.length > MAX_TASK_RAW_LENGTH) return null;

            const parsed = parseTaskInput(titleSeed);
            const enriched = applySilentPracticalEnrichment(titleSeed, parsed);
            const nextId = newId();
            const voiceFields = await persistTaskVoiceAttachment(nextId, payload);
            if (!voiceFields) return null;

            const linkedCaseId = enriched.linkedCaseId ?? null;
            const next: LegalTask = {
                id: nextId,
                rawText: titleSeed,
                title: enriched.title || titleSeed,
                location: enriched.location,
                parsedDate: enriched.parsedDate,
                reminderAt: null,
                isFatalDeadline: enriched.isFatalDeadline,
                linkedCaseId,
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
        [],
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
    }, []);

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
        [],
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
    }, []);

    const deleteTask = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (target?.voiceRef) {
                void removeTaskVoiceAttachment(target.voiceRef);
            }
            return prev.filter((t) => t.id !== id);
        });
    }, []);

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
    }, []);

    const reopenTask = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (!target?.completedAt || isTaskAgendaReadOnly(target, new Date())) return prev;
            return prepareAgendaTasks(
                prev.map((t) => (t.id === id ? { ...t, completedAt: null } : t)),
            );
        });
    }, []);

    const toggleTaskFatalDeadline = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, isFatalDeadline: !t.isFatalDeadline } : t,
            ),
        );
    }, []);

    const toggleTaskPinnedToFieldCurtain = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (!target) return prev;
            const willPin = !target.pinnedToFieldCurtain;
            if (willPin && target.isFatalDeadline) return prev;
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
    }, []);

    const setTaskLocation = useCallback((id: string, location: string | null) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, location } : t)),
        );
    }, []);

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
    }, []);

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
    }, []);

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
        [],
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
    }, []);

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
    }, []);

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
    }, []);

    const pendingTasks = useMemo(() => tasks.filter((t) => t.status === 'pending'), [tasks]);

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
            toggleTaskFatalDeadline,
            toggleTaskPinnedToFieldCurtain,
            setTaskLocation,
            addSubTask,
            toggleSubTaskComplete,
            setSubTaskLocation,
            addDocumentRequirement,
            toggleDocumentRequirement,
            addExpense,
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
            toggleTaskFatalDeadline,
            toggleTaskPinnedToFieldCurtain,
            setTaskLocation,
            addSubTask,
            toggleSubTaskComplete,
            setSubTaskLocation,
            addDocumentRequirement,
            toggleDocumentRequirement,
            addExpense,
            setTasks,
        ],
    );

    const data = useMemo(() => ({ tasks, pendingTasks }), [tasks, pendingTasks]);

    return useMemo(() => ({ ...data, ...actions }), [data, actions]);
}
