import type { CaseType, Party, ThirdParty } from '@/app/components/lawyer/LawyerNewCase/types';
import type { IncidentalSpawnContextEnriched } from '@/app/domain/lawsuit/incidentalSpawnPrefill';

export type LawsuitCreationCaseDetails = {
    court: string;
    type: string;
    stage: string;
    claimValue: string;
    retrialTargetStage: string;
    firstHearingDate: string;
};

export type LawsuitCreationSparkContext = {
    dossierKey: 'creation:lawuit:draft';
    jurisdiction: CaseType;
    caseDetails: LawsuitCreationCaseDetails;
    parties1: Party[];
    parties2: Party[];
    thirdParties?: ThirdParty[];
    incidentalFilingPartyId: string;
    incidentalOpposingPartyId: string;
    incidentalSpawnContext: IncidentalSpawnContextEnriched | null;
};

export const LAWSUIT_CREATION_DOSSIER_KEY = 'creation:lawuit:draft' as const;
