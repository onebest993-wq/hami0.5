import type { MutableRefObject } from 'react';
import type { CriminalDomainOrchestratorSlice } from './criminalOrchestratorSliceTypes';

export type CriminalOrchestratorCoreInput = {
    caseId: string | undefined;
    caseDataRef: MutableRefObject<Record<string, unknown> | null | undefined>;
};

/** شريحة orchestrator عامة — للـ modals حتى اكتمال typed slices */
export type CriminalOrchestratorSlice = Record<string, unknown>;

export function mergeCriminalOrchestratorSlices<T extends CriminalDomainOrchestratorSlice>(
    ...slices: Array<T | CriminalOrchestratorSlice>
): T & CriminalOrchestratorSlice {
    return Object.assign({}, ...slices) as T & CriminalOrchestratorSlice;
}

export type {
    CriminalBootOrchestratorSlice,
    CriminalJourneyFilterOrchestratorSlice,
    CriminalToastOrchestratorSlice,
    CriminalDecisionsOrchestratorSlice,
    CriminalRequestsOrchestratorSlice,
    CriminalDomainOrchestratorSlice,
} from './criminalOrchestratorSliceTypes';
