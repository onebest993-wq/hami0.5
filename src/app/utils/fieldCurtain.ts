import type { LegalTask } from '@/app/types/TaskEngine';

/** مهمة تظهر على ستارة الميدان — فقط عند التثبيت الصريح عبر زر «ستارة الميدان». */
export function isTaskOnFieldCurtain(task: LegalTask): boolean {
    if (task.isFatalDeadline) return false;
    return Boolean(task.pinnedToFieldCurtain);
}
