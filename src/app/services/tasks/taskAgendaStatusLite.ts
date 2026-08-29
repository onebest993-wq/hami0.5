/**
 * حالة أجندة المهام — خفيف لمسار التنبيهات/authenticity
 * بلا nlpParser / taskVoiceAttachment / tasksManager.
 */
import type { LegalTask } from '@/app/types/TaskEngine';

function startOfLocalDay(d: Date = new Date()): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function getSaturdayOfWeekContaining(ref: Date): Date {
    const d = startOfLocalDay(ref);
    const dow = d.getDay();
    const daysFromSat = (dow - 6 + 7) % 7;
    const sat = new Date(d);
    sat.setDate(d.getDate() - daysFromSat);
    return startOfLocalDay(sat);
}

export function isTaskMarkedDone(task: LegalTask): boolean {
    return task.completedAt != null;
}

/** يوم المهمة في الأجندة — تاريخ المهمة أو يوم الإنجاز للمهام بلا تاريخ */
export function getTaskAgendaDay(task: LegalTask): Date | null {
    if (task.parsedDate) return startOfLocalDay(task.parsedDate);
    if (task.completedAt) return startOfLocalDay(task.completedAt);
    return null;
}

/** بعد انتهاء يوم المهمة: بطاقة للمعاينة فقط */
export function isTaskAgendaReadOnly(task: LegalTask, now = new Date()): boolean {
    const taskDay = getTaskAgendaDay(task);
    if (!taskDay) return false;
    return startOfLocalDay(taskDay).getTime() < startOfLocalDay(now).getTime();
}

export function isTaskInCurrentAgendaWeek(task: LegalTask, now = new Date()): boolean {
    if (!task.parsedDate) return true;
    const taskWeek = getSaturdayOfWeekContaining(task.parsedDate).getTime();
    const thisWeek = getSaturdayOfWeekContaining(now).getTime();
    return taskWeek === thisWeek;
}

/** يوم المهمة انتهى ولم يُضغط «إنهاء المهمة» */
export function isTaskDayOverdueIncomplete(task: LegalTask, now = new Date()): boolean {
    if (isTaskMarkedDone(task)) return false;
    if (!task.parsedDate) return false;
    const day = startOfLocalDay(task.parsedDate).getTime();
    const today = startOfLocalDay(now).getTime();
    return day < today && isTaskInCurrentAgendaWeek(task, now);
}
