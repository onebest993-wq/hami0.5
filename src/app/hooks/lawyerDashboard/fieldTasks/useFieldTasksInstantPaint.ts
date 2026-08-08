import { useCallback, useLayoutEffect, useRef } from 'react';

import {
    loadFieldTasksInstantPaint,
    prefetchFieldTasksInstantPaint,
    type FieldTasksInstantPaintModule,
} from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';

prefetchFieldTasksInstantPaint();

export function useFieldTasksInstantPaintRef() {
    const instantPaintRef = useRef<FieldTasksInstantPaintModule | null>(null);

    useLayoutEffect(() => {
        void loadFieldTasksInstantPaint().then((m) => {
            instantPaintRef.current = m;
        });
    }, []);

    const withInstantPaint = useCallback((fn: (m: FieldTasksInstantPaintModule) => void) => {
        const cached = instantPaintRef.current;
        if (cached) {
            fn(cached);
            return;
        }
        void loadFieldTasksInstantPaint().then((m) => {
            instantPaintRef.current = m;
            fn(m);
        });
    }, []);

    return { instantPaintRef, withInstantPaint };
}

export function concealFieldTasksInstantLayer(
    withInstantPaint: (fn: (m: FieldTasksInstantPaintModule) => void) => void,
): void {
    withInstantPaint((m) => {
        m.concealFieldTasksWarmSheet();
        m.clearFieldTasksForceVisible();
    });
}
