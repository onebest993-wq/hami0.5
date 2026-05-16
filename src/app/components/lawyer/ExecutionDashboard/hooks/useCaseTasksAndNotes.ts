import { useMemo } from 'react';

export function useCaseTasksAndNotes(
    timelineEvents: any[],
    activeCaseNotesLog: any[],
    caseTasksPending: any[],
    caseNotesLog: any[],
) {
    const completedTaskTitles = useMemo(() => {
        const out = new Set<string>();
        for (const ev of timelineEvents) {
            const title = String((ev as any)?.title || '').trim();
            if (!title.startsWith('✅ إنجاز مهمة:')) continue;
            const taskTitle = title.replace(/^✅\s*إنجاز\s*مهمة:\s*/u, '').trim();
            if (taskTitle) out.add(taskTitle);
        }
        return out;
    }, [timelineEvents]);

    const savedNotesSplit = useMemo(() => {
        const doneTasks: typeof activeCaseNotesLog = [];
        const notes: typeof activeCaseNotesLog = [];
        for (const n of activeCaseNotesLog) {
            const t = String((n as any)?.title || '').trim();
            if (t && completedTaskTitles.has(t)) doneTasks.push(n);
            else notes.push(n);
        }
        return { notes, doneTasks };
    }, [activeCaseNotesLog, completedTaskTitles]);

    const activeCaseTasksPendingAll = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt),
        [caseTasksPending]
    );

    const activeGraceTasks = useMemo(
        () =>
            activeCaseTasksPendingAll.filter((t) =>
                /انتهاء المهلة/.test(String((t as any)?.title || '').trim())
            ),
        [activeCaseTasksPendingAll]
    );

    const activeCaseTasksPending = useMemo(
        () =>
            activeCaseTasksPendingAll.filter(
                (t) => !/انتهاء المهلة/.test(String((t as any)?.title || '').trim())
            ),
        [activeCaseTasksPendingAll]
    );

    const trashedTimelineEvents = useMemo(
        () => timelineEvents.filter((e) => Boolean(e.trashedAt)),
        [timelineEvents]
    );

    const trashedCaseNotes = useMemo(
        () => caseNotesLog.filter((n) => Boolean(n.trashedAt)),
        [caseNotesLog]
    );

    const trashedCaseTasks = useMemo(
        () => caseTasksPending.filter((t) => Boolean(t.trashedAt)),
        [caseTasksPending]
    );

    return {
        completedTaskTitles,
        savedNotesSplit,
        activeCaseTasksPendingAll,
        activeGraceTasks,
        activeCaseTasksPending,
        trashedTimelineEvents,
        trashedCaseNotes,
        trashedCaseTasks,
    };
}
