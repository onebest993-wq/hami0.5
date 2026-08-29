import {
    getDossierPresentationOutcome,
    getGoverningDossierPresentationRow,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getPersonalCoerciveSubtypeOutcome,
    isExecutorHubRowSuperseded,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/components/lawyer/ExecutionDashboard/utils/executorRequestEnforceability';
import { isForcedBringCycleResolved } from '@/app/components/lawyer/execution/forcedBringInvestigationLifecycle';
import type { ExecutionFile } from '@/app/types/execution';
import { isArrestWarrantEnforceable } from './coerciveStackInvestigationUtils';
import { isTravelBanEnforceable } from './coerciveStackTravelBanUtils';
import {
    isExecutiveDetentionBadgeSuppressed,
    isExecutiveDetentionPathEnforceable,
    isExecutiveDetentionPeriodActive,
    resolveExecutiveDetentionEffectiveJudgeOutcome,
    resolveExecutiveDetentionJudgeGoverningRow,
} from './coerciveStackDetentionUtils';

type PersonalCoerciveQueueState = ReturnType<typeof getPersonalCoerciveSubtypeOutcome>;

/** إحضار جبري ضمني عند بدء/إنهاء حبس تنفيذي — يمنع بقاء «تسجيل النتيجة» أو activeNoticeState */
export function appendImplicitForcedBringBroughtPatch(
    patch: Record<string, unknown>,
    ed: {
        forced_bring_in_personal_outcome?: string | null;
        forced_bring_in_personal_followup_logged?: boolean;
        debtorForcedToAttend?: boolean;
    } | null | undefined,
    forcedApproved: boolean
): Record<string, unknown> {
    if (!forcedApproved || isForcedBringCycleResolved(ed)) return patch;
    return {
        ...patch,
        forced_bring_in_personal_outcome: 'brought',
        forced_bring_in_personal_followup_logged: true,
        forcedAttendanceIssued: false,
        activeNoticeState: null,
        debtorForcedToAttend: true,
        debtorAttendedVoluntarily: true,
        debtorEvaded: false,
    };
}

export function resolvePrimaryDebtorCoerciveStack(args: {
    executionData: ExecutionFile | null | undefined;
    decisionsExecutionId: string | undefined;
    personalCoerciveDecisionBadges: boolean;
    debtorArrested?: boolean;
    forcedAttendancePending?: boolean;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
}): {
    travelSt: PersonalCoerciveQueueState;
    detentionSt: PersonalCoerciveQueueState;
    arrestSt: PersonalCoerciveQueueState;
    forcedSt: PersonalCoerciveQueueState;
    forcedNeedsOutcome: boolean;
    detentionAbsentia: boolean;
    showArrestWarrantBadge: boolean;
    showForcedAttendance: boolean;
    suppressDebtorAbsence: boolean;
} {
    const ed = args.executionData;
    const pcDecisions = args.personalCoerciveDecisionBadges !== false;
    const decId = args.decisionsExecutionId;
    const travelSt = decId
        ? getPersonalCoerciveSubtypeOutcome(decId, 'travel_ban', {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const detentionSt = decId
        ? getDossierPresentationOutcome(decId, {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const arrestSt = decId
        ? getPersonalCoerciveSubtypeOutcome(decId, 'arrest_warrant_investigation', {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const forcedSt = decId
        ? getPersonalCoerciveSubtypeOutcome(decId, 'forced_bring_in', {
              debtorKey: args.activeDebtorKey,
              primaryDebtorKey: args.primaryDebtorKey,
          })
        : null;
    const detentionAbsentia = ed?.executive_detention_request_in_absentia === true;
    const detentionPeriodActive = isExecutiveDetentionPeriodActive(ed);

    const detentionSuppressed = isExecutiveDetentionBadgeSuppressed(ed);

    const imprisonmentPresentSuppressesWarrant =
        !detentionAbsentia &&
        detentionPeriodActive &&
        !detentionSuppressed;

    const showArrestWarrantBadge =
        !args.debtorArrested &&
        !imprisonmentPresentSuppressesWarrant &&
        isArrestWarrantEnforceable(ed);

    const forcedBringResolved = isForcedBringCycleResolved(ed);
    const forcedNeedsOutcome =
        pcDecisions && Boolean(forcedSt?.approved) && !forcedBringResolved;

    const allDecisions = decId
        ? (readExecutorDecisionsArray(decId) as Record<string, unknown>[])
        : [];
    const scope = { debtorKey: args.activeDebtorKey, primaryDebtorKey: args.primaryDebtorKey };
    const forcedRow =
        decId && allDecisions.length > 0
            ? getGoverningPersonalCoerciveSubtypeRowFromDecisions(
                  allDecisions,
                  'forced_bring_in',
                  scope
              )
            : null;
    const forcedBringWorkflowActive =
        forcedRow != null && allDecisions.length > 0
            ? isExecutorRowApprovedWorkflowActive(forcedRow, allDecisions)
            : false;

    const showForcedAttendance =
        !showArrestWarrantBadge &&
        !forcedBringResolved &&
        forcedBringWorkflowActive &&
        (forcedNeedsOutcome || Boolean(args.forcedAttendancePending));

    const travelDecisionRow =
        decId && allDecisions.length > 0
            ? getGoverningPersonalCoerciveSubtypeRowFromDecisions(allDecisions, 'travel_ban', scope)
            : null;
    const judgeDecisionRow =
        decId && allDecisions.length > 0
            ? resolveExecutiveDetentionJudgeGoverningRow(allDecisions, ed, scope)
            : null;

    const hasTravelBanUi = isTravelBanEnforceable(ed, {
        travelDecisionRow,
        allDecisions,
    });

    const effectiveJudgeOutcome = decId
        ? resolveExecutiveDetentionEffectiveJudgeOutcome({
              executionData: ed,
              decisionsExecutionId: decId,
          })
        : ((ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null);
    const hasDetentionUi = isExecutiveDetentionPathEnforceable(
        ed,
        detentionSuppressed,
        effectiveJudgeOutcome,
        { judgeDecisionRow, allDecisions }
    );

    const suppressDebtorAbsence =
        showArrestWarrantBadge ||
        showForcedAttendance ||
        Boolean(args.debtorArrested) ||
        hasTravelBanUi ||
        hasDetentionUi;

    return {
        travelSt,
        detentionSt,
        arrestSt,
        forcedSt,
        forcedNeedsOutcome,
        detentionAbsentia,
        showArrestWarrantBadge,
        showForcedAttendance,
        suppressDebtorAbsence,
    };
}

/**
 * يصفّر أعلام ملف التنفيذ العالقة عندما أُغلقت دورة الطلب في مركز القرارات (طعن نهائي / أرشفة).
 */
export function buildPersonalCoerciveStaleExecutionPatch(input: {
    executionId: string;
    executionData: Record<string, unknown> | null | undefined;
    debtorKey?: string;
    primaryDebtorKey?: string;
}): Record<string, unknown> | null {
    const exId = String(input.executionId || '').trim();
    if (!exId) return null;
    const ed = input.executionData;
    const scope = { debtorKey: input.debtorKey, primaryDebtorKey: input.primaryDebtorKey };
    const patch: Record<string, unknown> = {};

    const dossierCycleActive = Boolean(getGoverningDossierPresentationRow(exId, scope));
    const detentionActive = isExecutiveDetentionPeriodActive(
        ed as { debtor_executive_detention_active?: boolean; executive_detention_until?: string | null }
    );
    const eligibleId = String(ed?.executive_detention_judge_eligible_decision_id ?? '').trim();
    const judgeDecisionId = String(ed?.executive_detention_judge_decision_id ?? '').trim();
    const judgeOutcome = ed?.executive_detention_judge_outcome;
    const eligibleRow = eligibleId
        ? (readExecutorDecisionsArray(exId).find(
              (r) => String((r as { id?: string }).id ?? '').trim() === eligibleId
          ) as Record<string, unknown> | undefined)
        : undefined;
    const eligibleAnchored =
        Boolean(eligibleRow) && !isExecutorHubRowSuperseded(eligibleRow as Record<string, unknown>);
  const dossierPhase = String(ed?.executive_dossier_phase ?? '').trim();
  const dossierPhaseLaneOpen =
    dossierPhase === 'handed_to_judge' ||
    dossierPhase === 'judge_decided' ||
    dossierPhase === 'detention_active';
  /** بعد موافقة المنفّذ تُغلق بطاقة العرض — يبقى مسار القاضي من executive_dossier_phase */
  const dossierLaneActive =
    dossierCycleActive ||
    dossierPhaseLaneOpen ||
    detentionActive ||
    Boolean(judgeDecisionId) ||
    judgeOutcome === 'approved' ||
    judgeOutcome === 'rejected' ||
    eligibleAnchored;
    if (!dossierLaneActive) {
        if (ed?.executive_dossier_phase != null && ed.executive_dossier_phase !== undefined) {
            patch.executive_dossier_phase = null;
        }
        if (ed?.executive_detention_judge_outcome != null && ed.executive_detention_judge_outcome !== undefined) {
            patch.executive_detention_judge_outcome = null;
        }
        if (eligibleId) {
            patch.executive_detention_judge_eligible_decision_id = null;
        }
        if (judgeDecisionId) {
            patch.executive_detention_judge_decision_id = null;
        }
        if (String(ed?.executive_detention_judge_rejection_reason ?? '').trim()) {
            patch.executive_detention_judge_rejection_reason = null;
        }
    }

    return Object.keys(patch).length > 0 ? patch : null;
}
