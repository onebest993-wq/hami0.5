import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import { isTaskMarkedDone } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { fieldTaskDueYmd } from '@/app/services/fieldTaskAlerts';

/** مهام مثبتة على الستارة وغير منجزة */
export function listActiveFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isTaskOnFieldCurtain(t) && !isTaskMarkedDone(t)));
}

/** مهام تظهر في ستارة «مهام اليوم» — فقط المثبتة صراحةً عبر زر ستارة الميدان */
export function isEligibleFieldDaySheetTask(task: LegalTask, _now = new Date()): boolean {
    if (task.status !== 'pending' || isTaskMarkedDone(task)) return false;
    return isTaskOnFieldCurtain(task);
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
