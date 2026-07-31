// @ts-nocheck
/** Phase C — ملاحظات الإضبارة + مهام المتابعة + أحداث الجدول الزمني */
import {
    useCallback,
    useMemo,
    useRef,
    type Dispatch,
    type MutableRefObject,
    type SetStateAction,
} from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { useStandardSubmit } from '@/app/hooks/useStandardSubmit';
import { syncExecutionTaskDue } from '@/app/services/calendarDossierSync';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

export type UseExecutionDashboardNotesTasksHandlersParams = {
    noteTitle: string;
    noteBody: string;
    isTask: boolean;
    taskDueDate: string;
    taskStatus: string;
    editingTaskId: string | null;
    caseTasksPending: Array<{ id: string; title?: string; body?: string; dueDate?: string }>;
    caseNotesLogRef: MutableRefObject<Array<{ id: string; title: string; body: string; createdAt: string }>>;
    caseTasksPendingRef: MutableRefObject<
        Array<{ id: string; title: string; body: string; dueDate?: string; createdAt: string; steps?: unknown[] }>
    >;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    currentFileId: string;
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    pushTimelineEvent: (event: TimelineEvent) => void;
    moveCaseTaskToTrash: (taskId: string) => void;
    setNoteTitle: Dispatch<SetStateAction<string>>;
    setNoteBody: Dispatch<SetStateAction<string>>;
    setIsTask: Dispatch<SetStateAction<boolean>>;
    setTaskDueDate: Dispatch<SetStateAction<string>>;
    setTaskStatus: Dispatch<SetStateAction<string>>;
    setEditingTaskId: Dispatch<SetStateAction<string | null>>;
    setEditingNoteId: Dispatch<SetStateAction<string | null>>;
    setCaseNotesLog: Dispatch<SetStateAction<Array<{ id: string; title: string; body: string; createdAt: string }>>>;
    setCaseTasksPending: Dispatch<
        SetStateAction<
            Array<{ id: string; title: string; body: string; dueDate?: string; createdAt: string; steps?: unknown[] }>
        >
    >;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setShowNotesModal: (show: boolean) => void;
    openFollowupModalPersisted?: () => void;
    closeUnifiedSeizureLog?: () => void;
};

export function useExecutionDashboardNotesTasksHandlers({
    noteTitle,
    noteBody,
    isTask,
    taskDueDate,
    taskStatus,
    editingTaskId,
    caseTasksPending,
    caseNotesLogRef,
    caseTasksPendingRef,
    timelineEventsRef,
    currentFileId,
    executionData,
    file,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    pushTimelineEvent,
    moveCaseTaskToTrash,
    setNoteTitle,
    setNoteBody,
    setIsTask,
    setTaskDueDate,
    setTaskStatus,
    setEditingTaskId,
    setEditingNoteId,
    setCaseNotesLog,
    setCaseTasksPending,
    setTimelineEvents,
    setShowNotesModal,
    openFollowupModalPersisted,
    closeUnifiedSeizureLog,
}: UseExecutionDashboardNotesTasksHandlersParams) {
    const noteSuccessMsgRef = useRef('');
    const noteSuccessVariantRef = useRef<'success' | 'info' | 'warning'>('success');

    const { runSubmit: runSaveNoteSubmit } = useStandardSubmit({
        successMessage: 'تم الحفظ',
        validationMessage: '',
        onClose: () => {
            setNoteTitle('');
            setNoteBody('');
            setIsTask(false);
            setTaskDueDate('');
            setTaskStatus('pending');
            setEditingTaskId(null);
        },
        showToast,
        validate: () => {
            if (!noteTitle.trim() || !noteBody.trim()) {
                showToast('يرجى تعبئة عنوان الملاحظة والتفاصيل', 'warning');
                return false;
            }
            return true;
        },
        getSuccessMessage: () => noteSuccessMsgRef.current,
        getSuccessVariant: () => noteSuccessVariantRef.current,
        submit: async () => {
            const now = new Date().toISOString();
            const sourceLabel = 'سجل الملاحظات والمهام';
            const titleTrim = noteTitle.trim();
            const bodyTrim = noteBody.trim();
            const curNotes = caseNotesLogRef.current;
            const curTasks = caseTasksPendingRef.current;
            const curTimeline = timelineEventsRef.current;
            if (!isTask) {
                noteSuccessMsgRef.current = 'تم حفظ الملاحظة بنجاح';
                noteSuccessVariantRef.current = 'success';
                const entryId = nextTimelineId();
                const nextNotes = [{ id: entryId, title: titleTrim, body: bodyTrim, createdAt: now }, ...curNotes];
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `📝 إضافة ملاحظة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    },
                    ...curTimeline,
                ];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            } else if (taskStatus === 'pending') {
                const effectiveDueDate = taskDueDate || now.slice(0, 10);
                if (editingTaskId) {
                    noteSuccessMsgRef.current = 'تم تعديل المهمة بنجاح';
                    noteSuccessVariantRef.current = 'success';
                    const nextTasks = curTasks.map((task) =>
                        task.id === editingTaskId
                            ? {
                                  ...task,
                                  title: titleTrim,
                                  body: bodyTrim,
                                  dueDate: effectiveDueDate,
                              }
                            : task,
                    );
                    const nextTimeline = [
                        {
                            id: nextTimelineId(),
                            type: 'other',
                            date: now,
                            timestamp: now,
                            title: `✏️ تعديل مهمة: ${titleTrim}`,
                            description: bodyTrim,
                            source: sourceLabel,
                        },
                        ...curTimeline,
                    ];
                    setCaseTasksPending(nextTasks);
                    setTimelineEvents(nextTimeline);
                    persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
                } else {
                    noteSuccessMsgRef.current = 'تم إنشاء المهمة — ستظهر في الملاحظات بعد الإنجاز';
                    noteSuccessVariantRef.current = 'info';
                    const taskId = nextTimelineId();
                    const nextTasks = [
                        {
                            id: taskId,
                            title: titleTrim,
                            body: bodyTrim,
                            dueDate: effectiveDueDate,
                            createdAt: now,
                        },
                        ...curTasks,
                    ];
                    const nextTimeline = [
                        {
                            id: nextTimelineId(),
                            type: 'other',
                            date: now,
                            timestamp: now,
                            title: `📌 مهمة قيد الإنجاز: ${titleTrim}`,
                            description: bodyTrim,
                            source: sourceLabel,
                        },
                        ...curTimeline,
                    ];
                    setCaseTasksPending(nextTasks);
                    setTimelineEvents(nextTimeline);
                    persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
                }
            } else {
                noteSuccessMsgRef.current = 'تم تسجيل إنجاز المهمة';
                noteSuccessVariantRef.current = 'success';
                const entryId = nextTimelineId();
                const nextNotes = [{ id: entryId, title: titleTrim, body: bodyTrim, createdAt: now }, ...curNotes];
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `✅ إنجاز مهمة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    },
                    ...curTimeline,
                ];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            }
        },
    });

    const handleSaveNote = useCallback(async () => {
        await runSaveNoteSubmit();
    }, [runSaveNoteSubmit]);

    const commitDossierNote = useCallback(
        async (payload: { title: string; bodyHtml: string; noteId?: string }) => {
            const titleTrim = String(payload.title || '').trim();
            const bodyTrim = String(payload.bodyHtml || '').trim();
            if (!titleTrim || !bodyTrim) {
                showToast('يرجى تعبئة عنوان الملاحظة والتفاصيل', 'warning');
                return;
            }
            const now = new Date().toISOString();
            const sourceLabel = 'سجل الملاحظات والمهام';
            const curNotes = caseNotesLogRef.current;
            const curTimeline = timelineEventsRef.current;
            const noteId = String(payload.noteId ?? '').trim();

            if (noteId) {
                if (!curNotes.some((n) => n.id === noteId)) {
                    showToast('تعذر العثور على الملاحظة للتعديل', 'error');
                    return;
                }
                const nextNotes = curNotes.map((n) =>
                    n.id === noteId ? { ...n, title: titleTrim, body: bodyTrim } : n,
                );
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other' as const,
                        date: now,
                        timestamp: now,
                        title: `✏️ تعديل ملاحظة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    },
                    ...curTimeline,
                ];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
                showToast('تم حفظ التعديل بنجاح', 'success');
            } else {
                const entryId = nextTimelineId();
                const nextNotes = [
                    { id: entryId, title: titleTrim, body: bodyTrim, createdAt: now },
                    ...curNotes,
                ];
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other' as const,
                        date: now,
                        timestamp: now,
                        title: `📝 إضافة ملاحظة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    },
                    ...curTimeline,
                ];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
                showToast('تم حفظ الملاحظة بنجاح', 'success');
            }
            setNoteTitle('');
            setNoteBody('');
            setEditingNoteId(null);
        },
        [
            caseNotesLogRef,
            timelineEventsRef,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setCaseNotesLog,
            setTimelineEvents,
            setNoteTitle,
            setNoteBody,
            setEditingNoteId,
        ],
    );

    const completePendingTask = useCallback(
        (taskId: string) => {
            const task = caseTasksPending.find((t) => t.id === taskId);
            if (!task) return;
            const now = new Date().toISOString();
            const nextTasks = caseTasksPendingRef.current.filter((t) => t.id !== taskId);
            const nextNotes = [
                {
                    id: nextTimelineId(),
                    title: task.title,
                    body: task.body,
                    createdAt: now,
                },
                ...caseNotesLogRef.current,
            ];
            const nextTimeline = [
                {
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: `✅ إنجاز مهمة: ${task.title}`,
                    description: task.body,
                    source: 'سجل الملاحظات والمهام',
                },
                ...timelineEventsRef.current,
            ];
            setCaseTasksPending(nextTasks);
            setCaseNotesLog(nextNotes);
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                caseTasksPending: nextTasks,
                caseNotesLog: nextNotes,
                timelineEvents: nextTimeline,
            });
            showToast('تم تسجيل إنجاز المهمة', 'success');
        },
        [
            caseTasksPending,
            caseTasksPendingRef,
            caseNotesLogRef,
            timelineEventsRef,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setCaseTasksPending,
            setCaseNotesLog,
            setTimelineEvents,
        ],
    );

    const beginEditPendingTask = useCallback(
        (taskId: string) => {
            const task = caseTasksPending.find((t) => t.id === taskId);
            if (!task) return;
            setEditingTaskId(task.id);
            setNoteTitle(task.title || '');
            setNoteBody(task.body || '');
            setIsTask(true);
            setTaskStatus('pending');
            setTaskDueDate(task.dueDate || '');
            setShowNotesModal(true);
        },
        [
            caseTasksPending,
            setEditingTaskId,
            setNoteTitle,
            setNoteBody,
            setIsTask,
            setTaskStatus,
            setTaskDueDate,
            setShowNotesModal,
        ],
    );

    const handleSaveTask = useCallback(
        (taskData: { title: string; body: string; dueDate: string; steps?: unknown[] }) => {
            const now = new Date().toISOString();
            const newId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const newTask = {
                id: newId,
                title: taskData.title,
                body: taskData.body,
                dueDate: taskData.dueDate,
                createdAt: now,
                steps: taskData.steps,
            };
            const nextTasks = [...caseTasksPendingRef.current, newTask];
            setCaseTasksPending(nextTasks);
            persistExecutionMerge({ caseTasksPending: nextTasks });
            syncExecutionTaskDue({
                executionId: currentFileId,
                task: newTask,
                caseNo:
                    String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                    undefined,
                clientName:
                    String(
                        executionData?.creditors?.[0]?.name ??
                            executionData?.clientName ??
                            file?.creditors?.[0]?.name ??
                            '',
                    ).trim() || undefined,
            });
            showToast('تم حفظ المهمة', 'success');
        },
        [caseTasksPendingRef, persistExecutionMerge, showToast, currentFileId, executionData, file, setCaseTasksPending],
    );

    const handleUpdateTask = useCallback(
        (taskId: string, updates: Partial<{ title: string; body: string; dueDate: string; steps?: unknown[] }>) => {
            const nextTasks = caseTasksPendingRef.current.map((t) =>
                t.id === taskId ? { ...t, ...updates } : t,
            );
            setCaseTasksPending(nextTasks);
            persistExecutionMerge({ caseTasksPending: nextTasks });
            const updated = nextTasks.find((t) => t.id === taskId);
            if (updated) {
                syncExecutionTaskDue({
                    executionId: currentFileId,
                    task: updated,
                    caseNo:
                        String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                        undefined,
                    clientName:
                        String(
                            executionData?.creditors?.[0]?.name ??
                                executionData?.clientName ??
                                file?.creditors?.[0]?.name ??
                                '',
                        ).trim() || undefined,
                });
            }
        },
        [caseTasksPendingRef, persistExecutionMerge, currentFileId, executionData, file, setCaseTasksPending],
    );

    const handleDeleteTask = useCallback(
        (taskId: string) => {
            moveCaseTaskToTrash(taskId);
        },
        [moveCaseTaskToTrash],
    );

    const handleAddTimelineEvent = useCallback(
        (event: { title: string; body?: string }) => {
            const newEvent: TimelineEvent = {
                id: `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                date: new Date().toISOString(),
                type: 'note',
                title: event.title,
                description: event.body,
            };
            pushTimelineEvent(newEvent);
        },
        [pushTimelineEvent],
    );

    const handleCompleteTask = useCallback(
        (taskId: string) => {
            completePendingTask(taskId);
        },
        [completePendingTask],
    );

    const handleMemoFollowupClick = useCallback(() => {
        if (typeof closeUnifiedSeizureLog === 'function') {
            closeUnifiedSeizureLog();
        }
        if (typeof openFollowupModalPersisted === 'function') {
            openFollowupModalPersisted();
            return;
        }
        try {
            useExecutionDashboardStore.getState().openModal('showUnifiedExecutionModal');
        } catch {
            showToast('تعذر فتح محضر المتابعة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
        }
    }, [openFollowupModalPersisted, closeUnifiedSeizureLog, showToast]);

    return useMemo(
        () => ({
            handleSaveNote,
            commitDossierNote,
            completePendingTask,
            beginEditPendingTask,
            handleSaveTask,
            handleUpdateTask,
            handleDeleteTask,
            handleAddTimelineEvent,
            handleCompleteTask,
            handleMemoFollowupClick,
        }),
        [
            handleSaveNote,
            commitDossierNote,
            completePendingTask,
            beginEditPendingTask,
            handleSaveTask,
            handleUpdateTask,
            handleDeleteTask,
            handleAddTimelineEvent,
            handleCompleteTask,
            handleMemoFollowupClick,
        ],
    );
}
