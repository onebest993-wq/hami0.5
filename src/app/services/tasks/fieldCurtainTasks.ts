import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import {
    isTaskDayOverdueIncomplete,
    isTaskInCurrentAgendaWeek,
    isTaskMarkedDone,
} from '@/app/services/tasks/taskAgendaStatusLite';
import { fieldTaskDueYmd } from '@/app/services/fieldTaskAlerts';
import { localTodayYmd } from '@/app/services/alertFutureGate';

/** مهام مثبتة على الستارة وغير منجزة */
export function listActiveFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isTaskOnFieldCurtain(t) && !isTaskMarkedDone(t)));
}

/** مهام تظهر في ستارة «مهام اليوم» — مثبتة، أو مستحقة/متأخرة ضمن الأسبوع الحالي */
export function isEligibleFieldDaySheetTask(task: LegalTask, now = new Date()): boolean {
    if (task.status !== 'pending' && task.status !== 'delegated') return false;
    if (isTaskMarkedDone(task)) return false;
    if (isTaskOnFieldCurtain(task)) return true;
    if (task.isFatalDeadline) return false;
    if (task.parsedDate && isTaskInCurrentAgendaWeek(task, now)) {
        const dueYmd = fieldTaskDueYmd(task);
        const todayYmd = localTodayYmd(now);
        if (dueYmd && dueYmd <= todayYmd) return true;
    }
    if (isTaskDayOverdueIncomplete(task, now)) return true;
    const dueYmd = fieldTaskDueYmd(task);
    if (!dueYmd) return false;
    return dueYmd === localTodayYmd(now);
}

export function listFieldDaySheetTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isEligibleFieldDaySheetTask(t, now)));
}

export function countFieldDaySheetTasks(tasks: LegalTask[], now = new Date()): number {
    return listFieldDaySheetTasks(tasks, now).length;
}

export function sortFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return [...tasks].sort((a, b) => {
        if (a.pinnedToFieldCurtain !== b.pinnedToFieldCurtain) {
            return a.pinnedToFieldCurtain ? -1 : 1;
        }
        const aPin = a.fieldCurtainPinnedAt?.getTime() ?? 0;
        const bPin = b.fieldCurtainPinnedAt?.getTime() ?? 0;
        if (aPin !== bPin) return bPin - aPin;
        const aDue = fieldTaskDueYmd(a) ?? '';
        const bDue = fieldTaskDueYmd(b) ?? '';
        if (aDue !== bDue) return aDue.localeCompare(bDue);
        return a.title.localeCompare(b.title, 'ar');
    });
}

export function countActiveFieldCurtainTasks(tasks: LegalTask[]): number {
    return listActiveFieldCurtainTasks(tasks).length;
}
