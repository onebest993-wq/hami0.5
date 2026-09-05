import type { LegalTask } from '@/app/types/TaskEngine';
import { useComposedQuantumTasks, useQuantumTasksCore } from '@/app/hooks/useQuantumTasksCore';
import { useQuantumTasksCreate } from '@/app/hooks/useQuantumTasksCreate';
import { prepareAgendaTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';

type UseQuantumTasksOptions = {
    /** يُستدعى داخل updater بعد حساب القائمة الجديدة — قبل إعادة الرسم */
    onTasksCommitted?: (tasks: LegalTask[]) => void;
};

/** خطاف الأجندة الكامل — NLP + ترقية الأسبوع. ستارة الميدان تستخدم Core في الـ Provider. */
export function useQuantumTasks(initial: LegalTask[] = [], options?: UseQuantumTasksOptions) {
    const core = useQuantumTasksCore(prepareAgendaTasks(initial), options);
    const create = useQuantumTasksCreate(core.setTasks);
    return useComposedQuantumTasks(core, create);
}
