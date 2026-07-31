import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import { normalizeDateToYmd } from '@/app/services/calendar/bridge/core';

/**
 * عدّاد ستارة الميدان لمسار metrics البارد — بلا tasksManager/utils أو calendarAuthenticity
 * (كانت تسحب vendor-supabase إلى entry عبر quantumTasksMetrics).
 */
function localTodayYmd(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function isMarkedDone(task: LegalTask): boolean {
    return task.completedAt != null;
}

function hasExplicitUserDate(task: LegalTask): boolean {
    if (task.status !== 'pending') return false;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) return true;
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) return true;
    return false;
}

function dueYmd(task: LegalTask): string | null {
    if (!hasExplicitUserDate(task)) return null;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) {
        return normalizeDateToYmd(task.reminderAt.toISOString());
    }
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) {
        return normalizeDateToYmd(task.parsedDate.toISOString());
    }
    return null;
}

function startOfLocalDayMs(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function saturdayOfWeekContainingMs(ref: Date): number {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const dow = d.getDay();
    const daysFromSat = (dow - 6 + 7) % 7;
    d.setDate(d.getDate() - daysFromSat);
    return d.getTime();
}

function isDayOverdueIncomplete(task: LegalTask, now: Date): boolean {
    if (isMarkedDone(task) || !task.parsedDate) return false;
    const day = startOfLocalDayMs(task.parsedDate);
    const today = startOfLocalDayMs(now);
    if (day >= today) return false;
    return saturdayOfWeekContainingMs(task.parsedDate) === saturdayOfWeekContainingMs(now);
}

function isEligibleFieldDaySheetTask(task: LegalTask, now: Date): boolean {
    if (task.status !== 'pending' && task.status !== 'delegated') return false;
    if (isMarkedDone(task)) return false;
    if (isTaskOnFieldCurtain(task)) return true;
    if (task.isFatalDeadline) return false;
    if (isDayOverdueIncomplete(task, now)) return true;
    const ymd = dueYmd(task);
    if (!ymd) return false;
    return ymd === localTodayYmd(now);
}

export function countFieldDaySheetTasksLite(tasks: LegalTask[], now = new Date()): number {
    let n = 0;
    for (const task of tasks) {
        if (isEligibleFieldDaySheetTask(task, now)) n += 1;
    }
    return n;
}
