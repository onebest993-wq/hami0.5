import type { CriminalCaseDraft } from '@/app/components/lawyer/criminal-system/criminalStore';
import type { InvestigationDefendantsPartyMix } from '@/app/components/lawyer/criminal-system/juvenileInvestigationRules';

export type CriminalCreationSparkContext = {
    dossierKey: 'creation:criminal:draft';
    draft: CriminalCaseDraft;
    stage: string;
    ourRepresentation: string;
    isSeveranceMode: boolean;
    isReferralStage: boolean;
    isPublicProsecutionComplainant: boolean;
    isTrialCourtStage: boolean;
    investigationLocationIncomplete: boolean;
    identifiedDefendantSaveIncomplete: boolean;
    complainantGuardianDataIncomplete: boolean;
    mixedUnknownWithIdentified: boolean;
    allDefendantsUnknownOnly: boolean;
    pendingSeveranceReason?: string;
    pendingSeveranceReasonDetail?: string;
    investigationPartyMix: InvestigationDefendantsPartyMix;
};

export const CRIMINAL_CREATION_DOSSIER_KEY = 'creation:criminal:draft' as const;

export function buildCriminalCreationSparkContext(input: {
    draft: CriminalCaseDraft;
    stage: string;
    isSeveranceMode: boolean;
    isReferralStage: boolean;
    isPublicProsecutionComplainant: boolean;
    investigationPartyMix: InvestigationDefendantsPartyMix;
    investigationLocationIncomplete: boolean;
    identifiedDefendantSaveIncomplete: boolean;
    complainantGuardianDataIncomplete: boolean;
    mixedUnknownWithIdentified: boolean;
    allDefendantsUnknownOnly: boolean;
    pendingSeveranceReason?: string;
    pendingSeveranceReasonDetail?: string;
}): CriminalCreationSparkContext {
    const isTrialCourtStage =
        input.stage === 'محكمة الجنح' ||
        input.stage === 'محكمة الجنايات' ||
        input.stage === 'محكمة الأحداث';

    return {
        dossierKey: CRIMINAL_CREATION_DOSSIER_KEY,
        draft: input.draft,
        stage: input.stage,
        ourRepresentation: String(input.draft.basics.ourRepresentation ?? ''),
        isSeveranceMode: input.isSeveranceMode,
        isReferralStage: input.isReferralStage,
        isPublicProsecutionComplainant: input.isPublicProsecutionComplainant,
        isTrialCourtStage,
        investigationLocationIncomplete: input.investigationLocationIncomplete,
        identifiedDefendantSaveIncomplete: input.identifiedDefendantSaveIncomplete,
        complainantGuardianDataIncomplete: input.complainantGuardianDataIncomplete,
        mixedUnknownWithIdentified: input.mixedUnknownWithIdentified,
        allDefendantsUnknownOnly: input.allDefendantsUnknownOnly,
        pendingSeveranceReason: input.pendingSeveranceReason,
        pendingSeveranceReasonDetail: input.pendingSeveranceReasonDetail,
        investigationPartyMix: input.investigationPartyMix,
    };
}
