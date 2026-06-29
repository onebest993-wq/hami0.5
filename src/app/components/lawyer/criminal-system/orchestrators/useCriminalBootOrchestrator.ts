/**
 * Boot orchestrator — prefetch + بوابات lazy (هيكل أولي؛ يُوسَّع مع تفكيك CriminalDashboard)
 */
import { useEffect } from 'react';

import type { CriminalBootOrchestratorSlice } from './criminalOrchestratorSliceTypes';

export function useCriminalBootOrchestrator(): CriminalBootOrchestratorSlice {
    useEffect(() => {
        void import('../criminalDashboardLazyModals');
        const prefetchSlices = () => {
            void import('../trialSessionsEngine').catch(() => undefined);
            void import('../cassationEngine').catch(() => undefined);
            void import('../proceduralContainersEngine').catch(() => undefined);
        };
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(prefetchSlices, { timeout: 5000 });
        } else {
            window.setTimeout(prefetchSlices, 1500);
        }
    }, []);

    return { bootReady: true };
}
