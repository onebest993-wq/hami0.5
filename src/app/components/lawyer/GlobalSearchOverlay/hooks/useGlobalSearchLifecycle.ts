import { useEffect, useRef } from 'react';
import { markGlobalSearchPerfPhase } from '@/app/services/search/globalSearchPerfMetrics';

/** علامة first-paint فقط — interactive من الـ eager shell */
export function useGlobalSearchLifecycle(open: boolean) {
    const reportedRef = useRef(false);

    useEffect(() => {
        if (!open) {
            reportedRef.current = false;
            return;
        }
        markGlobalSearchPerfPhase('first-paint');
    }, [open]);
}
