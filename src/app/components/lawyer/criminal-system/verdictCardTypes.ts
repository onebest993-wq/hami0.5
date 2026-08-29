import type { TrialVerdictOutcome } from './trialSessionsEngine';
import type { VerdictCassationResultValue } from './verdictCassationResultEngine';

export type { VerdictCassationResultValue };
export {
    VERDICT_CASSATION_RESULT_OPTIONS,
    VERDICT_REFERRAL_COURT_OPTIONS,
} from './verdictCassationResultEngine';

export type VerdictCardOutcome = TrialVerdictOutcome;

export type VerdictOrdinaryAppealTrack = {
    cassationDossierNumber?: string;
    filedAt?: string;
    result?: string;
    courtLabel?: string;
    /** جهة إصدار القرار التمييزي — للتحقق من م 267 (الهيئة العامة). */
    issuedBy?: string;
    /** تاريخ تسجيل نتيجة/قرار التمييز — بداية مهلة التصحيح (30 يوماً). */
    resultRecordedAt?: string;
    /** المحكمة المحال إليها — نقض لعدم الاختصاص. */
    referredCourtStage?: string;
    /** توجيهات محكمة التمييز الملزمة — نقض وإعادة للمحاكمة. */
    bindingDirections?: string;
    /** منطوق تعديل العقوبة — نقض وتعديل موضوعي. */
    penaltyModificationText?: string;
};

type VerdictInterventionStatus = 'pending' | 'accepted_quashed' | 'rejected';

export type VerdictInterventionAppealTrack = {
    targetedDecisionDescription?: string;
    interventionRequestNumber?: string;
    referredToAuthority?: string;
    status?: VerdictInterventionStatus | string;
};

export type VerdictCorrectionAppealTrack = {
    targetedDecisionDescription?: string;
    correctionRequestNumber?: string;
    filedAt?: string;
    status?: VerdictInterventionStatus | string;
};

export type VerdictCard = {
    id: string;
    outcome: VerdictCardOutcome;
    issuedAt: string;
    appealDeadline: string;
    decisionDraft?: string;
    sourceConclusionId?: string;
    proceduralNodeId?: string;
    defendantIds?: string[];
    ordinaryAppeal?: VerdictOrdinaryAppealTrack;
    interventionAppeal?: VerdictInterventionAppealTrack;
    correctionAppeal?: VerdictCorrectionAppealTrack;
    /** نوع القرار الختامي — منظومة إصدار القرار الجديدة. */
    finalDecisionKind?: import('./stageFinalDecisionTypes').StageFinalDecisionKind;
    presenceType?: 'وجاهي' | 'غيابي';
    penalty?: import('./stageFinalDecisionTypes').StageFinalPenaltyBlock;
    caseCrimeType?: 'جناية' | 'جنحة' | 'مخالفة';
    absentiaPublicationDate?: string;
    absentiaObjectionDeadline?: string;
    absentiaObjectionFiled?: boolean;
    absentiaTreatedAsInPerson?: boolean;
    cassationAppealFiled?: boolean;
    /** مسار إجرائي — موجز (أمر جزائي) أو كامل. */
    decisionProcedurePath?: import('./stageFinalDecisionTypes').StageFinalDecisionProcedurePath;
};

export type VerdictCardDisplayRow = VerdictCard & {
    sourceCardId: string;
    displayDefendantId?: string;
    displayDefendantName?: string;
};
