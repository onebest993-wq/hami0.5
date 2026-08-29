import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import {
    isTaskDayOverdueIncomplete,
    isTaskInCurrentAgendaWeek,
    isTaskMarkedDone,
} from '@/app/services/tasks/taskAgendaStatusLite';

/**
 * أهلية/عدّاد ستارة الميدان لمسار metrics البارد —
 * بلا tasksManager/utils أو calendarAuthenticity أو جسر التقويم.
 */
function dateToLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function hasExplicitUserDate(task: LegalTask): boolean {
    if (task.status !== 'pending') return false;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) return true;
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) return true;
    return false;
}

/** استحقاق محلي YYYY-MM-DD — بلا UTC/ISO */
export function fieldDaySheetDueYmdLite(task: LegalTask): string | null {
    if (!hasExplicitUserDate(task)) return null;
    if (task.reminderAt && !Number.isNaN(task.reminderAt.getTime())) {
        return dateToLocalYmd(task.reminderAt);
    }
    if (task.parsedDate && !Number.isNaN(task.parsedDate.getTime())) {
        return dateToLocalYmd(task.parsedDate);
    }
    return null;
}

/** نفس قاعدة ستارة «مهام اليوم» — بلا فرز أو تخصيص مصفوفة */
export function isEligibleFieldDaySheetTaskLite(task: LegalTask, now: Date): boolean {
    if (task.status !== 'pending' && task.status !== 'delegated') return false;
    if (isTaskMarkedDone(task)) return false;
    if (isTaskOnFieldCurtain(task)) return true;
    if (task.isFatalDeadline) return false;
    const todayYmd = dateToLocalYmd(now);
    if (task.parsedDate && isTaskInCurrentAgendaWeek(task, now)) {
        const weekDue = fieldDaySheetDueYmdLite(task);
        if (weekDue && weekDue <= todayYmd) return true;
    }
    if (isTaskDayOverdueIncomplete(task, now)) return true;
    const ymd = fieldDaySheetDueYmdLite(task);
    if (!ymd) return false;
    return ymd === todayYmd;
}

export function countFieldDaySheetTasksLite(tasks: LegalTask[], now = new Date()): number {
    let n = 0;
    for (const task of tasks) {
        if (isEligibleFieldDaySheetTaskLite(task, now)) n += 1;
    }
    return n;
}
