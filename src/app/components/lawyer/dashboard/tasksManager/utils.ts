import type { LegalTask } from '@/app/types/TaskEngine';
import { WORK_WEEK, WORK_WEEK_LAST_OFFSET } from './constants';
import { addDays, startOfLocalDay } from '@/app/utils/localDay';
import {
    isTaskInCurrentAgendaWeek,
    isTaskMarkedDone,
    getSaturdayOfWeekContaining,
} from '@/app/services/tasks/taskAgendaStatusLite';
import {
    applyReopenTask as applyReopenTaskLite,
    buildPostponeTaskPatch as buildPostponeTaskPatchLite,
    isTaskArchivedToHistory as isTaskArchivedToHistoryLite,
    releaseExpiredFieldCurtainPins as releaseExpiredFieldCurtainPinsLite,
} from '@/app/services/tasks/taskAgendaLifecycleLite';

export const COMPLETED_TASK_RETENTION_DAYS = 30;

function scheduleVoiceAttachmentCleanup(voiceRef: string): void {
    void import('@/app/services/tasks/taskVoiceAttachment')
        .then(({ removeTaskVoiceAttachment }) => removeTaskVoiceAttachment(voiceRef))
        .catch(() => undefined);
}

export function taskCompletedAt(task: LegalTask): Date | null {
    return task.completedAt ?? null;
}

export function isTaskArchivedToHistory(task: LegalTask, now = new Date()): boolean {
    return isTaskArchivedToHistoryLite(task, now);
}

/** إعادة فتح مهمة منتهية — الأرشيف يُعاد إلى اليوم حتى لا يُغلق الأسبوع السابق فوراً */
export function applyReopenTask(task: LegalTask, now = new Date()): LegalTask | null {
    return applyReopenTaskLite(task, now);
}

/** عند بداية أسبوع جديد: نقل مهام الأسبوع السابق إلى أرشيف المهام المنتهية */
export function finalizePastWeekTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return tasks.map((t) => {
        if (!isTaskArchivedToHistory(t, now)) return t;
        if (t.status === 'completed') return t;
        return {
            ...t,
            status: 'completed' as const,
            completedAt: t.completedAt ?? startOfLocalDay(t.parsedDate ?? now),
        };
    });
}

export function purgeExpiredCompletedTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    const cutoff = addDays(startOfLocalDay(now), -COMPLETED_TASK_RETENTION_DAYS).getTime();
    return tasks.filter((t) => {
        if (!isTaskArchivedToHistory(t, now)) return true;
        const ref = t.parsedDate ?? t.completedAt;
        if (!ref) {
            if (t.voiceRef) scheduleVoiceAttachmentCleanup(t.voiceRef);
            return false;
        }
        const keep = startOfLocalDay(ref).getTime() >= cutoff;
        if (!keep && t.voiceRef) scheduleVoiceAttachmentCleanup(t.voiceRef);
        return keep;
    });
}

export function releaseExpiredFieldCurtainPins(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return releaseExpiredFieldCurtainPinsLite(tasks, now);
}

/** ترحيل مهمة إلى يوم — داخل الأسبوع الحالي أو المؤجلة لأسبوع لاحق */
export function buildPostponeTaskPatch(
    targetDate: Date,
    now = new Date(),
): Pick<LegalTask, 'parsedDate' | 'reminderAt'> {
    return buildPostponeTaskPatchLite(targetDate, now);
}

export function prepareAgendaTasks(
    tasks: LegalTask[],
    now = new Date(),
    options?: { skipRetentionPurge?: boolean },
): LegalTask[] {
    let result = promoteDueSnoozedTasks(tasks, now);
    result = releaseExpiredFieldCurtainPins(result, now);
    result = finalizePastWeekTasks(result, now);
    if (!options?.skipRetentionPurge) {
        result = purgeExpiredCompletedTasks(result, now);
    }
    return result;
}

/** مهمة مؤجلة — أسبوع الموعد لا يزال في المستقبل */
function snoozedTaskAgendaWeekStart(task: LegalTask, now = new Date()): Date | null {
    if (task.reminderAt === null || Number.isNaN(task.reminderAt.getTime())) return null;
    return getSaturdayOfWeekContaining(task.reminderAt);
}

export function isDeferredSnoozedTask(task: LegalTask, now = new Date()): boolean {
    if (task.parsedDate !== null || task.reminderAt === null) return false;
    if (task.status !== 'pending' || isTaskMarkedDone(task)) return false;
    const taskWeek = snoozedTaskAgendaWeekStart(task, now);
    if (!taskWeek) return false;
    const thisWeek = getSaturdayOfWeekContaining(now).getTime();
    return taskWeek.getTime() > thisWeek;
}

export type AgendaWeeklyDayBlock = {
    key: (typeof WORK_WEEK)[number]['key'];
    label: string;
    offset: number;
    dayDate: Date;
    tasks: LegalTask[];
};

export type AgendaPendingPartition = {
    weeklyDayBlocks: AgendaWeeklyDayBlock[];
    distantTasks: LegalTask[];
    fatalTasks: LegalTask[];
};

/**
 * مرور واحد على pendingTasks → أسبوع + بعيدة + حتمية.
 * يستبدل 6–8 مرّات filter لكل تحديث.
 */
export function partitionAgendaPendingTasks(
    pendingTasks: LegalTask[],
    now: Date,
): AgendaPendingPartition {
    const weekStart = getSaturdayOfWeekContaining(now);
    const wsT = weekStart.getTime();
    const weT = addDays(weekStart, WORK_WEEK_LAST_OFFSET).getTime();
    const todayT = startOfLocalDay(now).getTime();
    const dayMs = 86_400_000;

    const dayBuckets: LegalTask[][] = WORK_WEEK.map(() => []);
    const distant: LegalTask[] = [];
    const fatal: LegalTask[] = [];

    for (const t of pendingTasks) {
        if (
            t.isFatalDeadline &&
            !t.completedAt &&
            !(t.parsedDate && startOfLocalDay(t.parsedDate).getTime() < todayT)
        ) {
            fatal.push(t);
        }

        if (isDeferredSnoozedTask(t, now)) {
            distant.push(t);
            continue;
        }

        if (t.parsedDate === null) continue;

        if (!isTaskInCurrentAgendaWeek(t, now)) {
            const taskWeek = getSaturdayOfWeekContaining(t.parsedDate).getTime();
            if (taskWeek > wsT) distant.push(t);
            continue;
        }

        const dayT = startOfLocalDay(t.parsedDate).getTime();
        const offset = Math.round((dayT - wsT) / dayMs);
        if (offset >= 0 && offset < WORK_WEEK.length) {
            dayBuckets[offset]!.push(t);
        } else if (dayT < wsT || dayT > weT) {
            distant.push(t);
        }
    }

    fatal.sort((a, b) => {
        const aT = a.parsedDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const bT = b.parsedDate?.getTime() ?? Number.POSITIVE_INFINITY;
        if (aT !== bT) return aT - bT;
        return a.title.localeCompare(b.title, 'ar');
    });

    const weeklyDayBlocks: AgendaWeeklyDayBlock[] = WORK_WEEK.map((d, i) => ({
        ...d,
        dayDate: addDays(weekStart, d.offset),
        tasks: dayBuckets[i] ?? [],
    }));

    return { weeklyDayBlocks, distantTasks: distant, fatalTasks: fatal };
}

/** مهمة مؤجلة — حان أسبوعها؛ تُرقّى إلى الأجندة الأساسية بيوم الموعد */
export function isSnoozedTaskDueOrOverdue(task: LegalTask, now = new Date()): boolean {
    if (task.parsedDate !== null || task.reminderAt === null) return false;
    if (task.status !== 'pending' || isTaskMarkedDone(task)) return false;
    const taskWeek = snoozedTaskAgendaWeekStart(task, now);
    if (!taskWeek) return false;
    const thisWeek = getSaturdayOfWeekContaining(now).getTime();
    return taskWeek.getTime() <= thisWeek;
}

export function promoteDueSnoozedTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return tasks.map((t) => {
        if (!isSnoozedTaskDueOrOverdue(t, now)) return t;
        const day = startOfLocalDay(t.reminderAt!);
        return {
            ...t,
            parsedDate: new Date(day.getTime()),
            reminderAt: null,
        };
    });
}

export function formatLocalYmdInput(date: Date): string {
    const d = startOfLocalDay(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function snoozedTaskDueDate(task: LegalTask): Date | null {
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) return startOfLocalDay(task.reminderAt);
    return null;
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
    const end = addDays(weekStartSaturday, WORK_WEEK_LAST_OFFSET).getTime();
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
