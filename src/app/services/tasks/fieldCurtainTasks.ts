import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import {
    isTaskDayOverdueIncomplete,
    isTaskMarkedDone,
} from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { fieldTaskDueYmd } from '@/app/services/fieldTaskAlerts';
import {
    daysFromTodayYmd,
    isEventDateOnOrAfterToday,
    localTodayYmd,
} from '@/app/services/alertFutureGate';

/** مهام مثبتة على الستارة وغير منجزة */
export function listActiveFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isTaskOnFieldCurtain(t) && !isTaskMarkedDone(t)));
}

/** مهام تظهر في ستارة «مهام اليوم» — مثبتة أو مستحقة اليوم/متأخرة (نفس منطق التنبيهات الميدانية) */
export function isEligibleFieldDaySheetTask(task: LegalTask, now = new Date()): boolean {
    if (task.status !== 'pending' || isTaskMarkedDone(task)) return false;
    if (task.isFatalDeadline) return false;

    if (task.pinnedToFieldCurtain) {
        return isTaskOnFieldCurtain(task);
    }

    const ymd = fieldTaskDueYmd(task);
    const overdueIncomplete = isTaskDayOverdueIncomplete(task, now);
    if (!ymd && !overdueIncomplete) return false;
    if (ymd && !isEventDateOnOrAfterToday(ymd, now) && !overdueIncomplete) return false;

    const todayYmd = localTodayYmd(now);
    const days = ymd ? daysFromTodayYmd(ymd, todayYmd) : 0;
    if (ymd && days > 7 && !overdueIncomplete) return false;

    return true;
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
