import type { Task } from '../../LawyerShared';
import { isEphemeralLawsuitTaskId } from '@/app/services/calendarAuthenticity';

const HIDDEN_TASK_TITLE_RE =
    /قضاء\s*مستعجل|القضاء\s*المستعجل|أمر\s*ولائي|إجراء\s*مستعجل|متابعة\s*القضاء|التظلم\s*من\s*القرار|القرار\s*الولائي/i;

/** مهام مُولَّدة آلياً من مسار الطلبات المستعجلة — لا تُعرض في الإضبارة المدنية. */
export function isCivilLawsuitHiddenSystemTask(task: Task): boolean {
    const id = String(task.id ?? '').trim();
    if (isEphemeralLawsuitTaskId(id)) return true;
    const title = String(task.title ?? '');
    return HIDDEN_TASK_TITLE_RE.test(title);
}

export function filterCivilLawsuitVisibleTasks(tasks: Task[]): Task[] {
    return tasks.filter((task) => !isCivilLawsuitHiddenSystemTask(task));
}
