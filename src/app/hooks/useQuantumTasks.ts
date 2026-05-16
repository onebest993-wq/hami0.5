import { useCallback, useMemo, useState } from 'react';
import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalTask,
    TaskExpenseEntry,
} from '@/app/types/TaskEngine';
import { addDays, isSameLocalDay, parseTaskInput, startOfLocalDay } from '@/app/utils/nlpParser';
import { buildFieldGrouping } from '@/app/utils/fieldViewGrouping';

export type AddTaskOptions = {
    /** عند الإضافة من عمود يوم في الأجندة الأسبوعية: يُثبَّت التاريخ بصمت */
    scheduledFor?: Date;
};

export type GroupedByTime = {
    overdue: LegalTask[];
    today: LegalTask[];
    tomorrow: LegalTask[];
    /** مواعيد لاحقة أو غير مصنفة في نافذة اليوم/الغد */
    unscheduled: LegalTask[];
};

function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `qt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Phase 34 — تعزيز صامت دون عرض أي شرح للمستخدم */
function applySilentPracticalEnrichment(
    trimmed: string,
    parsed: ReturnType<typeof parseTaskInput>,
    options?: AddTaskOptions,
): Pick<LegalTask, 'rawText' | 'title' | 'location' | 'parsedDate' | 'isFatalDeadline' | 'linkedCaseId'> {
    const silentFatal = /حتمي|تمييز|سقوط/i.test(trimmed);
    const isFatalDeadline = parsed.isFatalDeadline || silentFatal;

    const location = parsed.location;

    let parsedDate: Date | null = null;
    if (options?.scheduledFor !== undefined) {
        parsedDate = startOfLocalDay(options.scheduledFor);
    } else {
        parsedDate = parsed.parsedDate;
    }

    return {
        rawText: trimmed,
        title: parsed.title.trim() || trimmed,
        location,
        parsedDate,
        isFatalDeadline,
        linkedCaseId: parsed.linkedCaseId,
    };
}

export function useQuantumTasks(initial: LegalTask[] = []) {
    const [tasks, setTasks] = useState<LegalTask[]>(initial);

    const addTask = useCallback((rawText: string, options?: AddTaskOptions) => {
        const trimmed = String(rawText ?? '').trim();
        if (!trimmed) return;

        const parsed = parseTaskInput(trimmed);
        const enriched = applySilentPracticalEnrichment(trimmed, parsed, options);
        const next: LegalTask = {
            id: newId(),
            ...enriched,
            status: 'pending',
            pinnedToFieldCurtain: false,
            reminderAt: null,
            subTasks: [],
            documentRequirements: [],
            expenses: [],
        };

        setTasks((prev) => [...prev, next]);
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
            pinnedToFieldCurtain: false,
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
                pinnedToFieldCurtain: false,
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
        setTasks((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const batchTasks = useCallback((taskIds: string[], newDate: Date) => {
        const day = startOfLocalDay(newDate);
        const idSet = new Set(taskIds);
        setTasks((prev) =>
            prev.map((t) =>
                idSet.has(t.id) ? { ...t, parsedDate: new Date(day.getTime()) } : t,
            ),
        );
    }, []);

    const completeTask = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status: 'completed' as const } : t)),
        );
    }, []);

    const toggleTaskFatalDeadline = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, isFatalDeadline: !t.isFatalDeadline } : t,
            ),
        );
    }, []);

    const toggleTaskPinnedToFieldCurtain = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, pinnedToFieldCurtain: !t.pinnedToFieldCurtain } : t,
            ),
        );
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

    const groupedByLocation = useMemo(() => {
        const map = new Map<string, LegalTask[]>();
        for (const t of pendingTasks) {
            const key = t.location ?? 'غير محدد';
            const arr = map.get(key) ?? [];
            arr.push(t);
            map.set(key, arr);
        }
        const record: Record<string, LegalTask[]> = {};
        for (const [k, v] of map) {
            record[k] = v;
        }
        return record;
    }, [pendingTasks]);

    const fieldGrouping = useMemo(() => buildFieldGrouping(pendingTasks), [pendingTasks]);

    const groupedByTime = useMemo((): GroupedByTime => {
        const todayStart = startOfLocalDay(new Date());
        const tomorrowStart = addDays(todayStart, 1);
        const dayAfterTomorrow = addDays(tomorrowStart, 1);

        const overdue: LegalTask[] = [];
        const today: LegalTask[] = [];
        const tomorrow: LegalTask[] = [];
        const unscheduled: LegalTask[] = [];

        const candidates = pendingTasks.filter((t) => !t.isFatalDeadline);

        for (const t of candidates) {
            if (t.parsedDate === null) {
                unscheduled.push(t);
                continue;
            }
            const d = startOfLocalDay(t.parsedDate);
            if (d.getTime() < todayStart.getTime()) {
                overdue.push(t);
            } else if (isSameLocalDay(d, todayStart)) {
                today.push(t);
            } else if (isSameLocalDay(d, tomorrowStart)) {
                tomorrow.push(t);
            } else if (d.getTime() >= dayAfterTomorrow.getTime()) {
                unscheduled.push(t);
            } else {
                unscheduled.push(t);
            }
        }

        return { overdue, today, tomorrow, unscheduled };
    }, [pendingTasks]);

    return {
        tasks,
        pendingTasks,
        addTask,
        addWeeklyLocationBundle,
        addSnoozedBacklogTask,
        updateTask,
        deleteTask,
        batchTasks,
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
        groupedByLocation,
        fieldGrouping,
        groupedByTime,
        setTasks,
    };
}
