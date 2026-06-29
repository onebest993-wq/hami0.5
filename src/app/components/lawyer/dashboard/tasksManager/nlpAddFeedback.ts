import type { LegalTask } from '@/app/types/TaskEngine';
import { formatShortDate } from './utils';

/** ملخص صامت للمستخدم بعد إضافة مهمة عبر NLP */
export function buildNlpAddFeedback(task: LegalTask): string {
    const hints: string[] = [];
    if (task.location) hints.push(`📍 ${task.location}`);
    if (task.parsedDate) hints.push(`📅 ${formatShortDate(task.parsedDate)}`);
    if (task.isFatalDeadline) hints.push('⚠️ موعد حتمي');
    if (task.linkedCaseId) hints.push(`📁 ${task.linkedCaseId}`);
    return hints.length > 0 ? hints.join(' · ') : 'تمت إضافة المهمة';
}
