import { useCallback, useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { CalendarBridge } from '@/app/services/calendarBridge';
import { syncExecutionTaskDue } from '@/app/services/calendarDossierSync';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

type CaseNotesLog = NonNullable<ExecutionFile['caseNotesLog']>;
type CaseTasksPending = NonNullable<ExecutionFile['caseTasksPending']>;

type ShowToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
) => void;

export interface UseExecutionTrashAndPinsParams {
    showExecutionTrashModal: boolean;
    setShowExecutionTrashModal: (open: boolean) => void;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    caseNotesLogRef: MutableRefObject<CaseNotesLog>;
    caseTasksPendingRef: MutableRefObject<CaseTasksPending>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setCaseNotesLog: Dispatch<SetStateAction<CaseNotesLog>>;
    setCaseTasksPending: Dispatch<SetStateAction<CaseTasksPending>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: ShowToast;
    currentFileId: string;
    setPermanentDeleteTimelineId: Dispatch<SetStateAction<string | null>>;
}

function toastAfterPersistMicrotask(
    persist: () => boolean | void,
    showToast: ShowToast,
    successMessage: string,
    successType: 'success' | 'info' = 'success',
): void {
    queueMicrotask(() => {
        const ok = persist();
        if (ok === false) {
            showToast('تعذّر الحفظ — أعد المحاولة', 'error');
            return;
        }
        showToast(successMessage, successType);
    });
}

export function useExecutionTrashAndPins({
    showExecutionTrashModal,
    setShowExecutionTrashModal,
    timelineEventsRef,
    caseNotesLogRef,
    caseTasksPendingRef,
    setTimelineEvents,
    setCaseNotesLog,
    setCaseTasksPending,
    persistExecutionMerge,
    showToast,
    currentFileId,
    setPermanentDeleteTimelineId,
}: UseExecutionTrashAndPinsParams) {
    const [timelineEditDraft, setTimelineEditDraft] = useState<TimelineEvent | null>(null);

    useEffect(() => {
        if (!showExecutionTrashModal) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowExecutionTrashModal(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showExecutionTrashModal, setShowExecutionTrashModal]);

    const moveTimelineEventToTrash = useCallback(
        (ev: TimelineEvent) => {
            const cur = timelineEventsRef.current.find((e) => e.id === ev.id);
            if (!cur) {
                showToast('لا يمكن حذف حدث تابع لإضبارة أخرى من هذا العرض.', 'warning');
                return;
            }
            if (cur.trashedAt) return;
            const iso = new Date().toISOString();
            setTimelineEvents((prev) => {
                const next = prev.map((e) => (e.id === ev.id ? { ...e, trashedAt: iso } : e));
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ timelineEvents: next }),
                    showToast,
                    'نُقل الحدث إلى سلة مهملات الإضبارة',
                    'info',
                );
                return next;
            });
            if (String(ev.type || '') === 'appointment') {
                CalendarBridge.remove('execution', String(currentFileId), String(ev.id));
            }
        },
        [persistExecutionMerge, showToast, currentFileId, timelineEventsRef, setTimelineEvents],
    );

    const toggleTimelineEventPin = useCallback(
        (ev: TimelineEvent) => {
            if (!timelineEventsRef.current.some((e) => e.id === ev.id)) {
                showToast('لا يمكن تثبيت/إلغاء تثبيت حدث تابع لإضبارة أخرى من هذا العرض.', 'warning');
                return;
            }
            setTimelineEvents((prev) => {
                const next = prev.map((e) =>
                    e.id === ev.id ? { ...e, isPinned: !e.isPinned } : e,
                );
                queueMicrotask(() => {
                    void persistExecutionMerge({ timelineEvents: next });
                });
                return next;
            });
        },
        [persistExecutionMerge, showToast, timelineEventsRef, setTimelineEvents],
    );

    const requestEditTimelineEvent = useCallback(
        (ev: TimelineEvent) => {
            if (!timelineEventsRef.current.some((e) => e.id === ev.id)) {
                showToast('لا يمكن تعديل حدث تابع لإضبارة أخرى من هذا العرض.', 'warning');
                return;
            }
            setTimelineEditDraft({ ...ev });
        },
        [showToast, timelineEventsRef],
    );

    const restoreTimelineEventFromTrash = useCallback(
        (id: string, trashedAt: string | undefined) => {
            const idTrim = String(id || '').trim();
            if (!idTrim) return;
            const cur = timelineEventsRef.current.find(
                (e) => e.id === idTrim && String(e.trashedAt || '') === String(trashedAt || ''),
            );
            if (!cur || !cur.trashedAt) return;
            setTimelineEvents((prev) => {
                const next = prev.map((e) =>
                    e.id === idTrim && String(e.trashedAt || '') === String(trashedAt || '')
                        ? { ...e, trashedAt: undefined }
                        : e,
                );
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ timelineEvents: next }),
                    showToast,
                    'أُعيد الحدث إلى السجل الزمني',
                );
                return next;
            });
        },
        [persistExecutionMerge, showToast, timelineEventsRef, setTimelineEvents],
    );

    const permanentlyDeleteTimelineEvent = useCallback(
        (id: string) => {
            const had = timelineEventsRef.current.some((e) => e.id === id);
            setPermanentDeleteTimelineId(null);
            if (!had) return;
            setTimelineEvents((prev) => {
                const next = prev.filter((e) => e.id !== id);
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ timelineEvents: next }),
                    showToast,
                    'حُذف الحدث نهائياً من السجل',
                );
                return next;
            });
        },
        [persistExecutionMerge, showToast, timelineEventsRef, setTimelineEvents, setPermanentDeleteTimelineId],
    );

    const moveCaseNoteToTrash = useCallback(
        (id: string) => {
            const cur = caseNotesLogRef.current.find((n) => n.id === id);
            if (!cur || cur.trashedAt) return;
            const iso = new Date().toISOString();
            setCaseNotesLog((prev) => {
                const next = prev.map((n) =>
                    n.id === id ? { ...n, trashedAt: iso, pinned: false } : n,
                );
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ caseNotesLog: next }),
                    showToast,
                    'نُقلت الملاحظة إلى السلة',
                    'info',
                );
                return next;
            });
        },
        [persistExecutionMerge, showToast, caseNotesLogRef, setCaseNotesLog],
    );

    const moveCaseTaskToTrash = useCallback(
        (id: string) => {
            const cur = caseTasksPendingRef.current.find((t) => t.id === id);
            if (!cur || cur.trashedAt) return;
            const iso = new Date().toISOString();
            setCaseTasksPending((prev) => {
                const next = prev.map((t) =>
                    t.id === id ? { ...t, trashedAt: iso, pinned: false } : t,
                );
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ caseTasksPending: next }),
                    showToast,
                    'نُقلت المهمة إلى السلة',
                    'info',
                );
                return next;
            });
            const trashed = caseTasksPendingRef.current.find((t) => t.id === id);
            if (trashed) {
                syncExecutionTaskDue({
                    executionId: currentFileId,
                    task: { ...trashed, trashedAt: iso, pinned: false },
                });
            }
        },
        [persistExecutionMerge, showToast, currentFileId, caseTasksPendingRef, setCaseTasksPending],
    );

    const toggleCaseNotePin = useCallback(
        (id: string) => {
            setCaseNotesLog((prev) => {
                const next = prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
                queueMicrotask(() => {
                    void persistExecutionMerge({ caseNotesLog: next });
                });
                return next;
            });
        },
        [persistExecutionMerge, setCaseNotesLog],
    );

    const toggleCaseTaskPin = useCallback(
        (id: string) => {
            setCaseTasksPending((prev) => {
                const next = prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t));
                queueMicrotask(() => {
                    void persistExecutionMerge({ caseTasksPending: next });
                });
                return next;
            });
        },
        [persistExecutionMerge, setCaseTasksPending],
    );

    const saveTimelineEditDraft = useCallback(() => {
        if (!timelineEditDraft) return;
        setTimelineEvents((prev) => {
            const next = prev.map((e) =>
                e.id === timelineEditDraft.id
                    ? {
                          ...e,
                          title: timelineEditDraft.title,
                          description: timelineEditDraft.description,
                          date: timelineEditDraft.date,
                      }
                    : e,
            );
            toastAfterPersistMicrotask(
                () => persistExecutionMerge({ timelineEvents: next }),
                showToast,
                'تم تحديث الحدث في السجل',
            );
            return next;
        });
        setTimelineEditDraft(null);
    }, [timelineEditDraft, persistExecutionMerge, showToast, setTimelineEvents]);

    const restoreCaseNoteFromTrash = useCallback(
        (id: string, trashedAt: string | undefined) => {
            const idTrim = String(id || '').trim();
            if (!idTrim) return;
            const cur = caseNotesLogRef.current.find(
                (n) => n.id === idTrim && String(n.trashedAt || '') === String(trashedAt || ''),
            );
            if (!cur || !cur.trashedAt) return;
            setCaseNotesLog((prev) => {
                const next = prev.map((n) =>
                    n.id === idTrim && String(n.trashedAt || '') === String(trashedAt || '')
                        ? { ...n, trashedAt: undefined }
                        : n,
                );
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ caseNotesLog: next }),
                    showToast,
                    'أُعيدت الملاحظة',
                );
                return next;
            });
        },
        [persistExecutionMerge, showToast, caseNotesLogRef, setCaseNotesLog],
    );

    const permanentlyDeleteCaseNote = useCallback(
        (id: string) => {
            const had = caseNotesLogRef.current.some((n) => n.id === id);
            if (!had) return;
            setCaseNotesLog((prev) => {
                const next = prev.filter((n) => n.id !== id);
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ caseNotesLog: next }),
                    showToast,
                    'حُذفت الملاحظة نهائياً',
                );
                return next;
            });
        },
        [persistExecutionMerge, showToast, caseNotesLogRef, setCaseNotesLog],
    );

    const restoreCaseTaskFromTrash = useCallback(
        (id: string, trashedAt: string | undefined) => {
            const idTrim = String(id || '').trim();
            if (!idTrim) return;
            const cur = caseTasksPendingRef.current.find(
                (t) => t.id === idTrim && String(t.trashedAt || '') === String(trashedAt || ''),
            );
            if (!cur || !cur.trashedAt) return;
            setCaseTasksPending((prev) => {
                const next = prev.map((t) =>
                    t.id === idTrim && String(t.trashedAt || '') === String(trashedAt || '')
                        ? { ...t, trashedAt: undefined }
                        : t,
                );
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ caseTasksPending: next }),
                    showToast,
                    'أُعيدت المهمة',
                );
                return next;
            });
        },
        [persistExecutionMerge, showToast, caseTasksPendingRef, setCaseTasksPending],
    );

    const permanentlyDeleteCaseTask = useCallback(
        (id: string) => {
            const had = caseTasksPendingRef.current.some((t) => t.id === id);
            if (!had) return;
            setCaseTasksPending((prev) => {
                const next = prev.filter((t) => t.id !== id);
                toastAfterPersistMicrotask(
                    () => persistExecutionMerge({ caseTasksPending: next }),
                    showToast,
                    'حُذفت المهمة نهائياً',
                );
                return next;
            });
        },
        [persistExecutionMerge, showToast, caseTasksPendingRef, setCaseTasksPending],
    );

    return {
        timelineEditDraft,
        setTimelineEditDraft,
        moveTimelineEventToTrash,
        toggleTimelineEventPin,
        requestEditTimelineEvent,
        restoreTimelineEventFromTrash,
        permanentlyDeleteTimelineEvent,
        moveCaseNoteToTrash,
        moveCaseTaskToTrash,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        saveTimelineEditDraft,
        restoreCaseNoteFromTrash,
        permanentlyDeleteCaseNote,
        restoreCaseTaskFromTrash,
        permanentlyDeleteCaseTask,
    };
}
