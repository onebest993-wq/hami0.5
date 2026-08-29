import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import { isTaskMarkedDone } from '@/app/services/tasks/taskAgendaStatusLite';
import {
    countFieldDaySheetTasksLite,
    fieldDaySheetDueYmdLite,
    isEligibleFieldDaySheetTaskLite,
} from '@/app/services/tasks/fieldCurtainDayCountLite';

/** مهام مثبتة على الستارة وغير منجزة */
export function listActiveFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isTaskOnFieldCurtain(t) && !isTaskMarkedDone(t)));
}

export function listFieldDaySheetTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isEligibleFieldDaySheetTaskLite(t, now)));
}

export function countFieldDaySheetTasks(tasks: LegalTask[], now = new Date()): number {
    return countFieldDaySheetTasksLite(tasks, now);
}

export function sortFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return [...tasks].sort((a, b) => {
        if (a.pinnedToFieldCurtain !== b.pinnedToFieldCurtain) {
            return a.pinnedToFieldCurtain ? -1 : 1;
        }
        const aPin = a.fieldCurtainPinnedAt?.getTime() ?? 0;
        const bPin = b.fieldCurtainPinnedAt?.getTime() ?? 0;
        if (aPin !== bPin) return bPin - aPin;
        const aDue = fieldDaySheetDueYmdLite(a) ?? '';
        const bDue = fieldDaySheetDueYmdLite(b) ?? '';
        if (aDue !== bDue) return aDue.localeCompare(bDue);
        return a.title.localeCompare(b.title, 'ar');
    });
}

export function countActiveFieldCurtainTasks(tasks: LegalTask[]): number {
    let n = 0;
    for (const t of tasks) {
        if (isTaskOnFieldCurtain(t) && !isTaskMarkedDone(t)) n += 1;
    }
    return n;
}
