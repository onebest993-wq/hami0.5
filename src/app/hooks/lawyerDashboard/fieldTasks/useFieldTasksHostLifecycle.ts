import { useEffect, useLayoutEffect, useRef } from 'react';

import { warmFieldTasksOnOpen } from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm';
import {
    loadFieldTasksBootHydrator,
    loadFieldTasksHubLoader,
    warmQuantumTasksDiskRead,
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
        void loadFieldTasksHubLoader().then((m) => m.prefetchFieldTasksSheetModule());
    }, []);

    useEffect(() => {
        if (!fieldTasksSheetOpen) return;
        const ric =
            typeof window !== 'undefined' && 'requestIdleCallback' in window
                ? window.requestIdleCallback.bind(window)
                : null;
        const cancelRic =
            typeof window !== 'undefined' && 'cancelIdleCallback' in window
                ? window.cancelIdleCallback.bind(window)
                : null;
        let timeoutId: number | null = null;
        let idleId: number | null = null;
        const run = () => {
            void loadFieldTasksHubLoader().then((m) => m.prefetchTasksManagerModule());
        };
        if (ric) {
            idleId = ric(() => run(), { timeout: 2500 }) as number;
        } else {
            timeoutId = window.setTimeout(run, 900);
        }
        return () => {
            if (idleId != null && cancelRic) cancelRic(idleId);
            if (timeoutId != null) window.clearTimeout(timeoutId);
        };
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
        warmQuantumTasksDiskRead();
        warmFieldTasksOnOpen();
        void loadFieldTasksBootHydrator()
            .then((m) => m.hydrateFieldTasksShellForInstantOpen(true))
            .catch(() => undefined);
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
    void loadFieldTasksHubLoader().then((m) => m.prefetchFieldTasksSheetModule());
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry'
    ).catch(() => undefined);
}
