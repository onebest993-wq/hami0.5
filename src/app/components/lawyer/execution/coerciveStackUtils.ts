/** حقول تُدمَج من الكاش عند الاختلاف — لضمان استمرار مسارات الجبر الشخصي بعد المغادرة */
export const PERSONAL_COERCIVE_PERSIST_SIGNATURE_KEYS = [
    'forced_bring_in_personal_outcome',
    'forced_bring_in_personal_followup_logged',
    'investigationCourtRequested',
    'personal_arrest_warrant_stage',
    'personal_arrest_investigation_session_open',
    'debtor_wanted_arrest_warrant',
    'debtor_arrest_warrant_cleared_after_custody',
    'debtorEvaded',
    'debtorForcedToAttend',
    'debtor_executive_detention_active',
    'executive_dossier_phase',
    'executive_detention_judge_outcome',
    'executive_detention_judge_decision_id',
    'executive_detention_judge_eligible_decision_id',
    'executive_detention_released_or_closed_at',
    'executive_detention_until',
    'executive_detention_release_reason',
] as const;

export function personalCoercivePersistSignature(
    file: Record<string, unknown> | null | undefined,
): string {
    if (!file) return '';
    const slice: Record<string, unknown> = {};
    for (const key of PERSONAL_COERCIVE_PERSIST_SIGNATURE_KEYS) {
        slice[key] = file[key] ?? null;
    }
    return JSON.stringify(slice);
}

export {
    buildForcedBringLifecycleRestartBase,
    buildForcedBringPersonalOutcomePatch,
    buildInvestigationDebtorAttendedPatch,
    buildInvestigationSecuredBringPatch,
    buildInvestigationWarrantIssuedPatch,
    isForcedBringAbsconded,
    isForcedBringCycleResolved,
    isInvestigationLaneSettled,
    resolveForcedBringNeedsOutcomeUi,
    resolveForcedBringUiPhase,
    resolveInvestigationUiPhase,
    shouldShowForcedBringCard,
    shouldShowInvestigationCourtBlock,
    type ForcedBringPersonalOutcome,
    type ForcedBringUiPhase,
    type InvestigationUiPhase,
} from '@/app/components/lawyer/execution/forcedBringInvestigationLifecycle';

export {
    buildInvestigationCourtWithdrawExecutionPatch,
    isArrestWarrantEnforceable,
    isInvestigationCourtWithdrawn,
} from './coerciveStackInvestigationUtils';

export {
    isTravelBanEnforceable,
    isTravelBanLaneSettled,
    isTravelBanRequestCycleWithdrawn,
    isTravelBanRequestWithdrawn,
} from './coerciveStackTravelBanUtils';

export {
    buildExecutiveDetentionJudgeRejectedClosurePatch,
    buildExecutiveDetentionReleasePatch,
    isExecutiveDetentionBadgeSuppressed,
    isExecutiveDetentionPathEnforceable,
    isExecutiveDetentionPeriodActive,
    isPersonalCoerciveCycleClosed,
    resolveExecutiveDetentionEffectiveJudgeOutcome,
    resolveExecutiveDetentionJudgeUiOutcome,
} from './coerciveStackDetentionUtils';

export {
    appendImplicitForcedBringBroughtPatch,
    buildPersonalCoerciveStaleExecutionPatch,
    resolvePrimaryDebtorCoerciveStack,
} from './coerciveStackPrimaryDebtorUtils';
