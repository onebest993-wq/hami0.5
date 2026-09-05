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
        newCourt?: string;
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
    lawsuitFile?: {
        lawsuitJurisdiction?: string;
        selectedType?: string;
        disputeIntegrity?: string | null;
    };
    /** رقم الدعوى الأصلية لاشتقاق رقم الاعتراضية */
    sourceCaseNumber?: string;
    decisionDate?: string | null;
    appealDeadline?: string | null;
    cassationDeadline?: string | null;
    appealWindowLapsed?: boolean;
    cassationWindowLapsed?: boolean;
    /** محكمة مُلتقطة عند ختام المرافعة */
    presetCourt?: string;
    partyJudgmentDispositions?: import('@/app/domain/lawsuit/partyJudgmentDisposition').PartyJudgmentDisposition[];
    /** عند المسار المتبقي (اعتراض الغائب بعد استئناف الحاضر أو العكس) */
    forcedAllowedMethods?: string[];
    /** رول استئناف مستخرج موجود — التأكيد ينشئ إضبارة مستقلة */
    spawnIndependentDossier?: boolean;
    /**
     * من زر الشريط المسمّى — يُختار هذا الطرف طاعناً عند الفتح.
     * لا يفرض إضبارة مستقلة؛ قواعد shouldSpawnIndependentChallengeDossier تبقى سارية.
     */
    preferredChallengerPartyId?: string | number | null;
}
