import { useCallback, useState } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';

/** تأكيد إكمال المهام ذات الموعد الحتمي قبل استدعاء completeTask. */
export function useFatalTaskComplete(completeTask: (id: string) => void) {
    const [fatalConfirmId, setFatalConfirmId] = useState<string | null>(null);

    const requestComplete = useCallback(
        (task: LegalTask) => {
            if (task.isFatalDeadline) {
                setFatalConfirmId(task.id);
                return;
            }
            completeTask(task.id);
        },
        [completeTask],
    );

    const confirmFatalComplete = useCallback(() => {
        if (fatalConfirmId === null) return;
        completeTask(fatalConfirmId);
        setFatalConfirmId(null);
    }, [fatalConfirmId, completeTask]);

    const cancelFatalComplete = useCallback(() => {
        setFatalConfirmId(null);
    }, []);

    return {
        fatalConfirmId,
        fatalOpen: fatalConfirmId !== null,
        requestComplete,
        confirmFatalComplete,
        cancelFatalComplete,
    };
}
