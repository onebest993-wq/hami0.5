import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';
import { isTaskMarkedDone } from '@/app/components/lawyer/dashboard/tasksManager/utils';

/** مهام الستارة الميدانية — مثبتة وغير منجزة */
export function listActiveFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return sortFieldCurtainTasks(tasks.filter((t) => isTaskOnFieldCurtain(t) && !isTaskMarkedDone(t)));
}

export function sortFieldCurtainTasks(tasks: LegalTask[]): LegalTask[] {
    return [...tasks].sort((a, b) => {
        if (a.pinnedToFieldCurtain !== b.pinnedToFieldCurtain) {
            return a.pinnedToFieldCurtain ? -1 : 1;
        }
        const aPin = a.fieldCurtainPinnedAt?.getTime() ?? 0;
        const bPin = b.fieldCurtainPinnedAt?.getTime() ?? 0;
        if (aPin !== bPin) return bPin - aPin;
        return a.title.localeCompare(b.title, 'ar');
    });
}

export function countActiveFieldCurtainTasks(tasks: LegalTask[]): number {
    return listActiveFieldCurtainTasks(tasks).length;
}
