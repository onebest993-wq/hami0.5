import { useEffect, useLayoutEffect } from 'react';

import { prefetchFieldTasksSheetModule } from '@/app/runtime/fieldTasksHubLoader';
import { warmQuantumTasksDiskRead } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';
import {
    loadFieldTasksBootHydrator,
    loadFieldTasksHubLoader,
} from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';

/** تسخين boot + prefetch الستارة فقط — الأجندة عند «إدارة الكل». */
export function useFieldTasksHostLifecycle(): void {
    useLayoutEffect(() => {
        warmQuantumTasksDiskRead();
        void loadFieldTasksHubLoader().then((m) => {
            m.prefetchFieldTasksSheetModule();
        });
    }, []);

    useEffect(() => {
        let unbind: (() => void) | undefined;
        void loadFieldTasksBootHydrator().then((m) => {
            unbind = m.bindFieldTasksBootHydrator();
        });
        return () => unbind?.();
    }, []);
}

/** لمسة البلاطة: تسخين بلا تركيب Host حتى الفتح */
export function primeFieldTasksHostMount(): void {
    warmQuantumTasksDiskRead();
    prefetchFieldTasksSheetModule();
}
