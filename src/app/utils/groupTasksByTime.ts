import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays, isSameLocalDay, startOfLocalDay } from '@/app/utils/nlpParser';

export type GroupedByTime = {
    overdue: LegalTask[];
    today: LegalTask[];
    tomorrow: LegalTask[];
    /** مواعيد لاحقة أو غير مصنفة في نافذة اليوم/الغد */
    unscheduled: LegalTask[];
};

/** Phase 34 — تصنيف المهام المعلّقة حسب اليوم (يستثني المواعيد الحتمية). */
export function groupTasksByTime(
    pendingTasks: LegalTask[],
    refDate: Date = new Date(),
): GroupedByTime {
    const todayStart = startOfLocalDay(refDate);
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
}
