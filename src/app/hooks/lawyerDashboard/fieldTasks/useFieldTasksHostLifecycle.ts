import { useEffect, useLayoutEffect, useRef } from 'react';

import { warmFieldTasksOnOpen } from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
import { prefetchFieldTasksSheetModule } from '@/app/runtime/fieldTasksHubLoader';
import { warmQuantumTasksDiskRead } from '@/app/utils/quantumTasksStorage';
import {
    loadFieldTasksBootHydrator,
    loadFieldTasksHubLoader,
} from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';

type UseFieldTasksHostLifecycleParams = {
    initialSessionOpen: boolean;
    initialSessionSurface: 'sheet' | 'manager';
    fieldTasksSheetOpen: boolean;
    armFieldTasksManagerHost: () => void;
};

/** تسخين boot + prefetch + استعادة الجلسة بعد F5. */
export function useFieldTasksHostLifecycle({
    initialSessionOpen,
    initialSessionSurface,
    fieldTasksSheetOpen,
    armFieldTasksManagerHost,
}: UseFieldTasksHostLifecycleParams): void {
    const restoredWarmRef = useRef(false);

    useLayoutEffect(() => {
        warmQuantumTasksDiskRead();
        void loadFieldTasksHubLoader().then((m) => {
            m.prefetchFieldTasksSheetModule();
            m.prefetchTasksManagerModule();
        });
    }, []);

    useEffect(() => {
        if (!fieldTasksSheetOpen) return;
        void loadFieldTasksHubLoader().then((m) => m.prefetchTasksManagerModule());
    }, [fieldTasksSheetOpen]);

    useEffect(() => {
        let unbind: (() => void) | undefined;
        void loadFieldTasksBootHydrator().then((m) => {
            unbind = m.bindFieldTasksBootHydrator();
        });
        return () => unbind?.();
    }, []);

    useEffect(() => {
        if (!initialSessionOpen || restoredWarmRef.current) return;
        restoredWarmRef.current = true;
        warmFieldTasksOnOpen();
        if (initialSessionSurface === 'manager') {
            armFieldTasksManagerHost();
            void loadFieldTasksHubLoader()
                .then((m) => m.loadTasksManagerModule())
                .catch(() => undefined);
        } else {
            void loadFieldTasksHubLoader()
                .then((m) => m.loadFieldTasksSheetModule())
                .catch(() => undefined);
        }
    }, [armFieldTasksManagerHost, initialSessionOpen, initialSessionSurface]);
}

export function primeFieldTasksHostMount(setFieldTasksHostMounted: (mounted: boolean) => void): void {
    setFieldTasksHostMounted(true);
    warmQuantumTasksDiskRead();
    prefetchFieldTasksSheetModule();
    void loadFieldTasksHubLoader().then((m) => m.prefetchTasksManagerModule());
}
