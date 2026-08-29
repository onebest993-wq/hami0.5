import type { CaseStage } from '@/app/types/criminal';
import { isTrialCaseStage, resolveCaseStageFromRecord } from './criminalStageRuntimeCore';
import type { CriminalCase } from './criminalStore';

export type CriminalDashboardStageFlags = {
    stage: string;
    caseStage: CaseStage;
    isInvestigationPhase: boolean;
    isTrialPhase: boolean;
    isCassationStage: boolean;
    isTrialCourtStage: boolean;
    isInvestigationLocked: boolean;
};

/** أعلام المرحلة المشتقّة من سجل الإضبارة — دالة نقيّة بلا hooks. */
export function resolveCriminalDashboardStageFlags(
    criminalCase: CriminalCase | undefined,
): CriminalDashboardStageFlags {
    const stage = criminalCase?.basics.stage ?? '';
    const caseStage = criminalCase ? resolveCaseStageFromRecord(criminalCase) : 'investigation';
    const isInvestigationPhase = caseStage === 'investigation';
    const isTrialPhase = isTrialCaseStage(caseStage);
    const isCassationStage = stage === 'cassation_court';
    const isTrialCourtStage = caseStage === 'misdemeanor' || caseStage === 'felony';
    const isInvestigationLocked = Boolean(criminalCase?.isInvestigationLocked);

    return {
        stage,
        caseStage,
        isInvestigationPhase,
        isTrialPhase,
        isCassationStage,
        isTrialCourtStage,
        isInvestigationLocked,
    };
}
