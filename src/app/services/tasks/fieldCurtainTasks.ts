import type { LegalTask } from '@/app/types/TaskEngine';
import {
    fieldDaySheetDueYmdLite,
    isEligibleFieldDaySheetTaskLite,
} from '@/app/services/tasks/fieldCurtainDayCountLite';

export function listFieldDaySheetTasks(tasks: LegalTask[], now = new Date()): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isEligibleFieldDaySheetTaskLite(t, now)));
}

export function sortFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return [...tasks].sort((a, b) => {
        if (a.isFatalDeadline !== b.isFatalDeadline) {
            return a.isFatalDeadline ? -1 : 1;
        }
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

