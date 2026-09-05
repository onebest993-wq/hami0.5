import type { LegalTask } from '@/app/types/TaskEngine';

/** تثبيت يدوي على الستارة — الحتمي لا يُثبَّت هنا؛ يظهر في ستارة اليوم عبر الاستحقاق. */
export function isTaskOnFieldCurtain(task: LegalTask): boolean {
    if (task.isFatalDeadline) return false;
    return Boolean(task.pinnedToFieldCurtain);
}
