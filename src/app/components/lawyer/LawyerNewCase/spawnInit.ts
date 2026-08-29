import type { CaseType, Party } from './types';
import {
    buildIncidentalSpawnPrefill,
    type IncidentalSpawnContextEnriched,
} from '@/app/domain/lawsuit/incidentalSpawnPrefill';
import {
    getPendingIncidentalSpawnContext,
    getPendingLawyerNewCaseJurisdiction,
} from '@/app/runtime/lawyerNewCaseLoader';

export type LawyerNewCaseDetails = {
    number: string;
    court: string;
    type: string;
    judge: string;
    firstHearingDate: string;
    stage: string;
    claimValue: string;
    totalAgreedFees: string;
    retrialTargetStage?: string;
};

export function defaultCaseDetails(): LawyerNewCaseDetails {
    return {
        number: '',
        court: '',
        type: '',
        judge: '',
        firstHearingDate: '',
        stage: '',
        claimValue: '',
        totalAgreedFees: '',
        retrialTargetStage: '',
    };
}

export function defaultParty(side: 1 | 2): Party {
    return {
        id: side === 1 ? 'p1_1' : 'p2_1',
        name: '',
        status: '',
        isClient: false,
        phone: '',
        address: '',
    };
}

export function resolveIncidentalSpawnContext(
    prop: IncidentalSpawnContextEnriched | null | undefined,
): IncidentalSpawnContextEnriched | null {
    if (prop?.parent) return prop;
    const pending = getPendingIncidentalSpawnContext();
    return pending?.parent ? pending : null;
}

export function resolveInitialIncidentalPrefill(
    prop: IncidentalSpawnContextEnriched | null | undefined,
) {
    const ctx = resolveIncidentalSpawnContext(prop);
    return ctx ? buildIncidentalSpawnPrefill(ctx) : null;
}

export function resolveInitialCaseType(preset?: string | null): CaseType {
    const pending = getPendingLawyerNewCaseJurisdiction();
    return (preset as CaseType) ?? pending ?? 'civil';
}
