import { useState } from 'react';
import type { CriminalToastOrchestratorSlice } from './criminalOrchestratorSliceTypes';

/** toast قانوني خفيف داخل CriminalDashboard */
export function useCriminalToastOrchestrator(): CriminalToastOrchestratorSlice {
    const [legalToast, setLegalToast] = useState('');

    return { legalToast, setLegalToast };
}
