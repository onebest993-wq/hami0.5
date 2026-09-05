/**
 * إكمال / إعادة فتح / ترحيل / تثبيت — بلا nlpParser ولا prepareAgendaTasks.
 * مسار ستارة الميدان يستورد هذا الملف فقط.
 */
import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays, startOfLocalDay } from '@/app/utils/localDay';
import { getSaturdayOfWeekContaining, isTaskMarkedDone } from '@/app/services/tasks/taskAgendaStatusLite';
import { WORK_WEEK_LAST_OFFSET } from '@/app/components/lawyer/dashboard/tasksManager/constants';

export function isTaskArchivedToHistory(task: LegalTask, now = new Date()): boolean {
    if (!task.parsedDate || task.isFatalDeadline) return false;
    const taskWeek = getSaturdayOfWeekContaining(task.parsedDate).getTime();
    const thisWeek = getSaturdayOfWeekContaining(now).getTime();
    return taskWeek < thisWeek;
}

/** إعادة فتح مهمة منتهية — الأرشيف يُعاد إلى اليوم حتى لا يُغلق الأسبوع السابق فوراً */
export function applyReopenTask(task: LegalTask, now = new Date()): LegalTask | null {
    if (!task.completedAt) return null;
    const archived = isTaskArchivedToHistory(task, now);
    const today = startOfLocalDay(now);
    return {
        ...task,
        completedAt: null,
        status: 'pending',
        parsedDate: archived ? today : task.parsedDate,
        reminderAt: archived ? null : task.reminderAt,
    };
}

export function releaseExpiredFieldCurtainPins(tasks: LegalTask[], _now = new Date()): LegalTask[] {
    return tasks.map((t) => {
        if (!t.pinnedToFieldCurtain) return t;
        if (isTaskMarkedDone(t)) {
            return { ...t, pinnedToFieldCurtain: false, fieldCurtainPinnedAt: null };
        }
        return t;
    });
}

function isDateInWorkWeekLite(date: Date, weekStartSaturday: Date): boolean {
    const start = startOfLocalDay(weekStartSaturday).getTime();
    const end = addDays(weekStartSaturday, WORK_WEEK_LAST_OFFSET).getTime();
    const t = startOfLocalDay(date).getTime();
    return t >= start && t <= end;
}

/** ترحيل مهمة إلى يوم — داخل الأسبوع الحالي أو المؤجلة لأسبوع لاحق */
export function buildPostponeTaskPatch(
    targetDate: Date,
    now = new Date(),
): Pick<LegalTask, 'parsedDate' | 'reminderAt'> {
    const day = startOfLocalDay(targetDate);
    const weekStart = getSaturdayOfWeekContaining(now);
    if (isDateInWorkWeekLite(day, weekStart)) {
        return { parsedDate: day, reminderAt: null };
    }
    return { parsedDate: null, reminderAt: day };
}
