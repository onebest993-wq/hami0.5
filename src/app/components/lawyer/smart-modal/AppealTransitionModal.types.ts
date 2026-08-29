import type { IncidentalCase, CaseStage } from '../LawyerShared';
import type { AppealRouteContext } from './smartFile/appealRouteEligibility';

export type AppealTransitionMode = 'postJudgment' | 'opponentRegistration';

export interface AppealTransitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        appealType: string;
        appellant: string;
        filingDate: string;
        newCaseNumber: string;
        notes: string;
        includedOpponentPartyIds?: Array<number | string>;
        includedAppellantPartyIds?: Array<number | string>;
        appealDossierMode?: 'standard' | 'interpleader_appellant' | 'against_interpleader';
    }) => void;
    currentParties: Array<{ id: number | string; name: string; role?: string; isClient?: boolean }>;
    representedParty: string;
    judgmentType?: string;
    judgmentForm?: string;
    lastJudgmentType?: string | null;
    stageName?: string | null;
    finalDecision?: string | null;
    incidentalCases?: IncidentalCase[];
    appealRoute?: AppealRouteContext;
    mode?: AppealTransitionMode;
    stages?: CaseStage[];
    lawsuitFile?: { lawsuitJurisdiction?: string; selectedType?: string };
    /** رقم الدعوى الأصلية لاشتقاق رقم الاعتراضية */
    sourceCaseNumber?: string;
}
