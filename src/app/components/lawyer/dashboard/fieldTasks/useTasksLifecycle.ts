import { useEffect, useRef, useState } from 'react';
import { useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';
import {
    markFieldTasksPerfPhase,
    reportFieldTasksPerf,
} from '@/app/services/fieldTasks/fieldTasksPerfMetrics';

/** جاهزية التخزين — sync boot يكفي لعرض الأجندة فوراً */
export function useTasksStorageHydratedSignal(active: boolean): boolean {
    const { storageHydrated } = useQuantumTasksData();
    return active && storageHydrated;
}

/** marker تفاعلي — بعد hydration + ظهور الـ shell */
export function useTasksLifecycle(
    open: boolean,
    shellVisible: boolean,
    onHydrated?: () => void,
): boolean {
    const reportedRef = useRef(false);
    const [interactive, setInteractive] = useState(false);
    const storageReady = useTasksStorageHydratedSignal(open && shellVisible);

    useEffect(() => {
        if (!open) {
            reportedRef.current = false;
            setInteractive(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open || !shellVisible || !storageReady || reportedRef.current) return;
        reportedRef.current = true;
        setInteractive(true);
        markFieldTasksPerfPhase('first-paint');
        markFieldTasksPerfPhase('interactive');
        reportFieldTasksPerf({ surface: 'sheet' });
        onHydrated?.();
    }, [open, shellVisible, storageReady, onHydrated]);

    /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخرت الجاهزية (T1/T9) */
    useEffect(() => {
        if (!open || !shellVisible || reportedRef.current) return;

        const markInteractiveFallback = () => {
            if (reportedRef.current) return;
            reportedRef.current = true;
            setInteractive(true);
            markFieldTasksPerfPhase('first-paint');
            markFieldTasksPerfPhase('interactive');
            reportFieldTasksPerf({ surface: 'sheet' });
            onHydrated?.();
        };

        const fallback = window.setTimeout(markInteractiveFallback, 1_200);
        return () => window.clearTimeout(fallback);
    }, [open, shellVisible, onHydrated]);

    return interactive;
}
