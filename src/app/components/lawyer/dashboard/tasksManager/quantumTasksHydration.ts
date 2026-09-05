import type { LegalTask } from '@/app/types/TaskEngine';

/** دمج التخزين مع التعديلات الحية — لا نستبدل مهام المستخدم أثناء التحميل */
export function mergeHydratedQuantumTasks(live: LegalTask[], loaded: LegalTask[]): LegalTask[] {
    if (loaded.length === 0) return live;
    if (live.length === 0) return loaded;
    const liveIds = new Set(live.map((t) => t.id));
    const fromStorageOnly = loaded.filter((t) => !liveIds.has(t.id));
    if (fromStorageOnly.length === 0) return live;
    return [...live, ...fromStorageOnly];
}

/** حقول يغيّرها prepareAgendaTasks — إن نقص التاريخ تُتخطّى ترقية المؤجّل عند منتصف الليل */
export function agendaTasksLifecycleRevision(tasks: LegalTask[]): string {
    return tasks
        .map(
            (t) =>
                `${t.id}:${t.status}:${t.isFatalDeadline ? 1 : 0}:${t.pinnedToFieldCurtain ? 1 : 0}:${t.completedAt?.getTime() ?? ''}:${t.parsedDate?.getTime() ?? ''}:${t.reminderAt?.getTime() ?? ''}`,
        )
        .join('|');
}
