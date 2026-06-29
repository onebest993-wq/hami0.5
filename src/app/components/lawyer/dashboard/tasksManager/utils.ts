import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays, startOfLocalDay } from '@/app/utils/nlpParser';
import { removeTaskVoiceAttachment } from '@/app/services/tasks/taskVoiceAttachment';

export const COMPLETED_TASK_RETENTION_DAYS = 30;

export function getSaturdayOfWeekContaining(ref: Date): Date {
    const d = startOfLocalDay(ref);
    const dow = d.getDay();
    const daysFromSat = (dow - 6 + 7) % 7;
    const sat = new Date(d);
    sat.setDate(d.getDate() - daysFromSat);
    return startOfLocalDay(sat);
}

export function taskCompletedAt(task: LegalTask): Date | null {
    return task.completedAt ?? null;
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

export function isTaskArchivedToHistory(task: LegalTask, now = new Date()): boolean {
    if (!task.parsedDate || task.isFatalDeadline) return false;
    const taskWeek = getSaturdayOfWeekContaining(task.parsedDate).getTime();
    const thisWeek = getSaturdayOfWeekContaining(now).getTime();
    return taskWeek < thisWeek;
}

/** يوم المهمة انتهى ولم يُضغط «إنهاء المهمة» */
export function isTaskDayOverdueIncomplete(task: LegalTask, now = new Date()): boolean {
    if (isTaskMarkedDone(task)) return false;
    if (!task.parsedDate) return false;
    const day = startOfLocalDay(task.parsedDate).getTime();
    const today = startOfLocalDay(now).getTime();
    return day < today && isTaskInCurrentAgendaWeek(task, now);
}

/** عند بداية أسبوع جديد: نقل مهام الأسبوع السابق إلى الأرشيف */
export function finalizePastWeekTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return tasks.map((t) => {
        if (!isTaskArchivedToHistory(t, now)) return t;
        if (t.status === 'completed') return t;
        return { ...t, status: 'completed' as const };
    });
}

export function purgeExpiredCompletedTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    const cutoff = addDays(startOfLocalDay(now), -COMPLETED_TASK_RETENTION_DAYS).getTime();
    return tasks.filter((t) => {
        if (!isTaskArchivedToHistory(t, now)) return true;
        const ref = t.parsedDate ?? t.completedAt;
        if (!ref) {
            if (t.voiceRef) void removeTaskVoiceAttachment(t.voiceRef);
            return false;
        }
        const keep = startOfLocalDay(ref).getTime() >= cutoff;
        if (!keep && t.voiceRef) void removeTaskVoiceAttachment(t.voiceRef);
        return keep;
    });
}

export function releaseExpiredFieldCurtainPins(tasks: LegalTask[], now = new Date()): LegalTask[] {
    const today = startOfLocalDay(now).getTime();
    return tasks.map((t) => {
        if (!t.pinnedToFieldCurtain) return t;
        if (isTaskMarkedDone(t)) {
            return { ...t, pinnedToFieldCurtain: false, fieldCurtainPinnedAt: null };
        }
        const pinDay = t.fieldCurtainPinnedAt
            ? startOfLocalDay(t.fieldCurtainPinnedAt).getTime()
            : today;
        if (pinDay < today) {
            return { ...t, pinnedToFieldCurtain: false, fieldCurtainPinnedAt: null };
        }
        return t;
    });
}

export function prepareAgendaTasks(
    tasks: LegalTask[],
    now = new Date(),
    options?: { skipRetentionPurge?: boolean },
): LegalTask[] {
    let result = releaseExpiredFieldCurtainPins(tasks, now);
    result = finalizePastWeekTasks(result, now);
    if (!options?.skipRetentionPurge) {
        result = purgeExpiredCompletedTasks(result, now);
    }
    return result;
}

export function getArchivedTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return tasks.filter((t) => isTaskArchivedToHistory(t, now));
}

/** يوم الأجندة انتهى (قبل اليوم الحالي) */
export function isAgendaDayPast(dayDate: Date, now = new Date()): boolean {
    return startOfLocalDay(dayDate).getTime() < startOfLocalDay(now).getTime();
}

export function isDateInWorkWeek(date: Date, weekStartSaturday: Date): boolean {
    const start = startOfLocalDay(weekStartSaturday).getTime();
    const end = addDays(weekStartSaturday, 5).getTime();
    const t = startOfLocalDay(date).getTime();
    return t >= start && t <= end;
}

export type CompletedTasksWeekGroup = {
    key: string;
    label: string;
    tasks: LegalTask[];
};

export function groupArchivedTasksByWeek(tasks: LegalTask[], now = new Date()): CompletedTasksWeekGroup[] {
    const archived = getArchivedTasks(tasks, now)
        .filter((t) => t.parsedDate)
        .sort((a, b) => (b.parsedDate?.getTime() ?? 0) - (a.parsedDate?.getTime() ?? 0));

    const map = new Map<string, CompletedTasksWeekGroup>();
    for (const task of archived) {
        if (!task.parsedDate) continue;
        const weekStart = getSaturdayOfWeekContaining(task.parsedDate);
        const key = weekStart.toISOString();
        const label = `أسبوع ${formatShortDate(weekStart)}`;
        const existing = map.get(key);
        if (existing) {
            existing.tasks.push(task);
        } else {
            map.set(key, { key, label, tasks: [task] });
        }
    }
    return Array.from(map.values());
}

export function formatShortDate(d: Date): string {
    try {
        return d.toLocaleDateString('ar-IQ', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

export function formatIqd(n: number): string {
    try {
        return `${new Intl.NumberFormat('ar-IQ').format(n)} د.ع.`;
    } catch {
        return `${n} د.ع.`;
    }
}

export function parseAmountInput(s: string): number {
    const n = parseFloat(String(s).replace(/[,\s٬]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isReminderDue(task: LegalTask, now: Date): boolean {
    if (task.reminderAt === null) return false;
    const today = startOfLocalDay(now).getTime();
    const r = startOfLocalDay(task.reminderAt).getTime();
    return today >= r;
}

export function snoozeAfterDays(days: number): Date {
    return addDays(startOfLocalDay(new Date()), days);
}

/** تاريخ محلي من حقل date (yyyy-mm-dd) دون انزياح UTC */
export function dateFromYmdInput(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (Number.isNaN(dt.getTime())) return null;
    return startOfLocalDay(dt);
}
