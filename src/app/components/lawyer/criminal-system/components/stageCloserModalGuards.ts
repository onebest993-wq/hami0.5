import type { StageConclusion } from '../criminalStore';
import { isProceduralRouteDecisionType } from '../stageJourneyTransitionCore';
import { isReferralTrialStage } from '../criminalStagePresentationCore';

/** حارس نوع: هل القيمة مرحلة إحالة صالحة (جنح/جنايات)؟ */
export const isReferralStageValue = (v: string): v is 'محكمة الجنح' | 'محكمة الجنايات' =>
    isReferralTrialStage(v);

/** حارس نوع: هل القيمة نوع قرار غلق مرحلة معروف؟ */
export const isStageDecisionType = (v: string): v is StageConclusion['decisionType'] =>
    v === 'referral' ||
    v === 'closing' ||
    v === 'temporary_closing' ||
    v === 'conviction' ||
    v === 'juvenile_deliver_guardian' ||
    v === 'juvenile_behavioral_surveillance' ||
    v === 'juvenile_reform_boys' ||
    v === 'juvenile_youth_school' ||
    v === 'juvenile_fine' ||
    v === 'juvenile_severance_referral' ||
    v === 'acquittal' ||
    v === 'release' ||
    v === 'expiration' ||
    v === 'cassation_confirm' ||
    v === 'cassation_quash_remand' ||
    v === 'cassation_quash_reduce' ||
    v === 'cassation_quash_acquit_release' ||
    v === 'case_split_fugitive_referral' ||
    v === 'temporary_release_insufficient_evidence' ||
    v === 'postpone_article_183' ||
    v === 'default_judgment_issue' ||
    v === 'default_judgment_opposition' ||
    isProceduralRouteDecisionType(v);

/** حارس نوع: هل القيمة حالة متهم لحظة القرار؟ */
export const isDecisionDefendantStatus = (
    v: string,
): v is StageConclusion['defendantStatusAtDecision'] =>
    v === 'detained' || v === 'bailed' || v === 'fugitive';
