import { useCallback, useMemo, useState } from 'react';
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

export type AddTaskOptions = TaskEnrichmentOptions;

function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `qt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useQuantumTasks(initial: LegalTask[] = []) {
    const [tasks, setTasks] = useState<LegalTask[]>(() => prepareAgendaTasks(initial));

    const addTask = useCallback((rawText: string, options?: AddTaskOptions) => {
        const trimmed = String(rawText ?? '').trim();
        if (!trimmed) return;

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
        };

        setTasks((prev) => [...prev, next]);
        // Audit log: تمت إضافة مهمة (نستخدم title لـ readable message)
        try {
            void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                AuditLog.task.created({
                    taskId: nextId,
                    title: enriched.title || trimmed,
                    linkedCaseId: linkedCaseId ?? undefined,
                });
            });
        } catch { /* silent */ }
    }, []);

    const addWeeklyLocationBundle = useCallback((scheduledFor: Date, location: string, actionTitles: string[]) => {
        const loc = location.trim();
        const titles = actionTitles.map((x) => x.trim()).filter((x) => x.length > 0);
        if (!loc || titles.length === 0) return;

        const day = startOfLocalDay(scheduledFor);
        const parentTitle = titles[0]!;
        const subTasks: LegalSubTask[] = titles.slice(1).map((title) => ({
            id: newId(),
            title,
            location: null,
            isCompleted: false,
        }));

        const next: LegalTask = {
            id: newId(),
            rawText: [loc, ...titles].join(' — '),
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
        };
        setTasks((prev) => [...prev, next]);
    }, []);

    const addSnoozedBacklogTask = useCallback(
        (title: string, reminderAt: Date, location: string | null = null) => {
            const trimmed = title.trim();
            if (!trimmed) return;
            const remind = startOfLocalDay(reminderAt);
            const next: LegalTask = {
                id: newId(),
                rawText: trimmed,
                title: trimmed,
                location: location?.trim() ? location.trim() : null,
                parsedDate: null,
                reminderAt: new Date(remind.getTime()),
                isFatalDeadline: false,
                linkedCaseId: null,
                status: 'pending',
                completedAt: null,
                pinnedToFieldCurtain: false,
                fieldCurtainPinnedAt: null,
                subTasks: [],
                documentRequirements: [],
                expenses: [],
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
            if (target) {
                try {
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        AuditLog.fieldTask.deleted({ taskId: id, title: target.title });
                    });
                } catch { /* silent */ }
            }
            return prev.filter((t) => t.id !== id);
        });
    }, []);

    const completeTask = useCallback((id: string) => {
        setTasks((prev) => {
            const target = prev.find((t) => t.id === id);
            if (target && !target.completedAt) {
                try {
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        AuditLog.task.completed({ taskId: id, title: target.title });
                    });
                } catch { /* silent */ }
            }
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

    return {
        tasks,
        pendingTasks,
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
        setTasks,
    };
}
