import { useState } from 'react';
import type { CriminalJourneyFilterOrchestratorSlice } from './criminalOrchestratorSliceTypes';

/** فلاتر رحلة القضية (عقدة / طرف / فرع) */
export function useCriminalJourneyFilterOrchestrator(): CriminalJourneyFilterOrchestratorSlice {
    const [selectedNodeFilter, setSelectedNodeFilter] = useState('');
    const [selectedPartyFilterId, setSelectedPartyFilterId] = useState('');
    const [selectedJourneyBranchId, setSelectedJourneyBranchId] = useState('');

    return {
        selectedNodeFilter,
        setSelectedNodeFilter,
        selectedPartyFilterId,
        setSelectedPartyFilterId,
        selectedJourneyBranchId,
        setSelectedJourneyBranchId,
    };
}
