import { useEffect, useRef, useState } from 'react';
import { useQuantumTasksData } from '@/app/hooks/useQuantumTasksContext';

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
        onHydrated?.();
    }, [open, shellVisible, storageReady, onHydrated]);

    return interactive;
}
