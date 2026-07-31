/**

 * Boot orchestrator — prefetch نوافذ lazy فقط عند الإقلاع.

 * محركات cassation/trial/procedural لا تُسخَّن هنا (تتسابق مع أول رسم)؛

 * تُسخَّن عند نية التبويب عبر criminalDashboardLazyRegistry.

 */

import { useEffect } from 'react';



import type { CriminalBootOrchestratorSlice } from './criminalOrchestratorSliceTypes';



export function useCriminalBootOrchestrator(): CriminalBootOrchestratorSlice {

    useEffect(() => {

        void import('../criminalDashboardLazyModals');

    }, []);



    return { bootReady: true };

}


