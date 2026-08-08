import {
    getDossierPresentationOutcome,
    getGoverningDossierPresentationRow,
    getGoverningDossierPresentationRowFromDecisions,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getPersonalCoerciveSubtypeOutcome,
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    isExecutorDecisionRowEffectivelyEnforced,
    isExecutorRowApprovedWorkflowActive,
} from '@/app/components/lawyer/ExecutionDashboard/utils/executorRequestEnforceability';
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
import { isForcedBringCycleResolved } from '@/app/components/lawyer/execution/forcedBringInvestigationLifecycle';

type PersonalCoerciveQueueState = ReturnType<typeof getPersonalCoerciveSubtypeOutcome>;

/** @deprecated استخدم isInvestigationLaneSettled — مُبقى للتوافق */
export function isInvestigationCoerciveLaneSettled(
    ed:
        | {
              investigationPathDebtorPresent?: boolean;
              debtor_arrest_warrant_cleared_after_custody?: boolean;
          }
        | null
        | undefined,
): boolean {
    return (
        ed?.investigationPathDebtorPresent === true ||
        ed?.debtor_arrest_warrant_cleared_after_custody === true
    );
}

/** التنازل عن المفاتحة مُلغى من مسار الإحضار الجبري — دائماً false */
export function canWithdrawInvestigationCourtPath(_input: {
    isHistoricalMode?: boolean;
    coerciveUiLocked?: boolean;
    forcedOutcomeAbsconded: boolean;
    investigationCourtWithdrawn: boolean;
    investigationPathDebtorPresent?: boolean;
    warrantCustodyRecorded: boolean;
    arrestPending: boolean;
    investigationCourtRequested: boolean;
    arrestApproved: boolean;
    arrestAlternative: boolean;
    investigationPostApprovalActive: boolean;
}): boolean {
    return false;
}

export function isInvestigationCourtWithdrawn(
    ed: { investigation_court_withdrawn_at?: string | null } | null | undefined,
): boolean {
    return Boolean(String(ed?.investigation_court_withdrawn_at ?? '').trim());
}

/** حقول ملف التنفيذ عند التنازل عن مفاتحة محكمة التحقيق (مسار قرارات فقط — ليس UI الإحضار) */
export function buildInvestigationCourtWithdrawExecutionPatch(nowIso?: string): Record<string, unknown> {
    const now = nowIso ?? new Date().toISOString();
    return {
        investigation_court_withdrawn_at: now,
        investigationCourtRequested: false,
        investigationMemoIssued: false,
        investigationPathDebtorPresent: false,
        personal_arrest_investigation_session_open: false,
        personal_arrest_warrant_stage: 'none',
        debtor_wanted_arrest_warrant: false,
        debtor_arrest_warrant_cleared_after_custody: false,
        forced_bring_in_personal_outcome: null,
        forced_bring_in_personal_followup_logged: false,
        debtorEvaded: false,
    };
}

/** إغلاق دورة التنفيذ الجبري (إخلاء سبيل) — تُخفى شارات الطلبات من القرارات */
export function isPersonalCoerciveCycleClosed(
    ed: { personal_coercive_cycle_closed_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.personal_coercive_cycle_closed_at ?? '').trim());
}

/** إعادة دورة عرض الإضبارة/الحبس إلى البداية بعد إخلاء السبيل */
export function buildExecutiveDetentionReleasePatch(nowIso?: string): Record<string, unknown> {
    const now = nowIso ?? new Date().toISOString();
    return {
        executive_detention_released_or_closed_at: now,
        debtor_executive_detention_active: false,
        executive_detention_until: null,
        executive_detention_days_total: null,
        executive_detention_reminder_sent: false,
        executive_detention_judge_outcome: null,
        executive_detention_judge_eligible_decision_id: null,
        executive_detention_judge_decision_id: null,
        executive_detention_judge_rejection_reason: null,
        executive_dossier_phase: null,
        executive_detention_request_in_absentia: false,
        personal_coercive_cycle_closed_at: null,
    };
}

/** إغلاق مسار الإضبارة/الحبس بعد رفض القاضي — يعود طلب العرض للتفعيل اليدوي */
export function buildExecutiveDetentionJudgeRejectedClosurePatch(
    nowIso: string,
    rejectionReason: string,
    judgeDecisionId: string,
): Record<string, unknown> {
    const reason = String(rejectionReason ?? '').trim();
    return {
        executive_detention_released_or_closed_at: nowIso,
        debtor_executive_detention_active: false,
        executive_detention_until: null,
        executive_detention_days_total: null,
        executive_detention_reminder_sent: false,
        executive_dossier_phase: null,
        executive_detention_request_in_absentia: false,
        personal_coercive_cycle_closed_at: null,
        executive_detention_judge_decision_id: judgeDecisionId,
        executive_detention_judge_outcome: 'rejected',
        executive_detention_judge_eligible_decision_id: null,
        executive_detention_judge_rejection_reason: reason || null,
        executive_detention_release_reason: reason ? `رفض قاضي البداءة: ${reason}` : 'رفض قاضي البداءة',
    };
}

/** انتهاء/إغلاق مسار الحبس دون دورة كاملة (مثلاً انتهاء المدة) */
export function isExecutiveDetentionBadgeSuppressed(
    ed:
        | {
              personal_coercive_cycle_closed_at?: string | null;
              executive_detention_released_or_closed_at?: string | null;
          }
        | null
        | undefined
): boolean {
    if (isPersonalCoerciveCycleClosed(ed)) return true;
    return Boolean(String(ed?.executive_detention_released_or_closed_at ?? '').trim());
}

/** نتيجة قرار القاضي الفعلية — تتزامن مع نقض التمييز لرفض الحبس */
export function resolveExecutiveDetentionJudgeUiOutcome(input: {
    storedOutcome?: 'approved' | 'rejected' | null;
    judgeRow?: Record<string, unknown> | null;
}): 'approved' | 'rejected' | null {
    const row = input.judgeRow;
    if (row && typeof row === 'object') {
        if (isExecutorRowEffectivelyApproved(row)) return 'approved';
        if (isExecutorRowRejectedAndFinal(row)) return 'rejected';
        const raw = String(
            (row as { executiveDetentionJudgeOutcome?: string }).executiveDetentionJudgeOutcome ||
                (row as { executorOutcome?: string }).executorOutcome ||
                ''
        ).trim();
        if (raw === 'approved' || raw === 'rejected') return raw;
    }
    return input.storedOutcome ?? null;
}

/** تراجع صريح عن طلب منع السفر — لا يُربط بإخلاء سبيل الحبس وحده */
export function isTravelBanRequestWithdrawn(
    ed: { travel_ban_withdrawn_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.travel_ban_withdrawn_at ?? '').trim());
}

/** تراجع عن دورة الطلب مع إبقاء منع السفر نافذاً حتى السداد */
export function isTravelBanRequestCycleWithdrawn(
    ed: { travel_ban_request_cycle_withdrawn_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.travel_ban_request_cycle_withdrawn_at ?? '').trim());
}

/** دورة منع السفر منتهية — يُعاد تفعيل تقديم طلب جديد */
export function isTravelBanLaneSettled(
    ed:
        | {
              travel_ban_withdrawn_at?: string | null;
              debtor_travel_ban_active?: boolean;
          }
        | null
        | undefined,
    opts: { travelCycleActive: boolean }
): boolean {
    if (isTravelBanRequestWithdrawn(ed)) return true;
    if (!opts.travelCycleActive) return true;
    if (ed?.debtor_travel_ban_active !== true) return true;
    return false;
}

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

/** حبس تنفيذي فعّال — يُخفى الشارة بعد انتهاء المدة أو إخلاء السبيل */
export function isExecutiveDetentionPeriodActive(
    ed: { debtor_executive_detention_active?: boolean; executive_detention_until?: string | null } | null | undefined
): boolean {
    if (ed?.debtor_executive_detention_active !== true) return false;
    const until = String(ed?.executive_detention_until ?? '').trim();
    if (!until) return true;
    const end = new Date(`${until}T23:59:59`);
    if (Number.isNaN(end.getTime())) return true;
    return Date.now() <= end.getTime();
}


/** مذكرة قبض نافذة — صدور الأمر فقط، لا عند تقديم مفاتحة التحقيق أو قيد البت */
export function isArrestWarrantEnforceable(
    ed:
        | {
              debtor_wanted_arrest_warrant?: boolean;
              personal_arrest_warrant_stage?: string | null;
              debtor_arrest_warrant_cleared_after_custody?: boolean;
          }
        | null
        | undefined
): boolean {
    if (ed?.debtor_arrest_warrant_cleared_after_custody === true) return false;
    if (ed?.debtor_wanted_arrest_warrant === true) return true;
    return String(ed?.personal_arrest_warrant_stage ?? '').trim() === 'issued';
}

/** منع سفر نافذ — بعد موافقة المنفذ وانتهاء مسار الطعن الموقِف */
export function isTravelBanEnforceable(
    ed: { debtor_travel_ban_active?: boolean; travel_ban_withdrawn_at?: string | null } | null | undefined,
    opts?: {
        travelDecisionRow?: Record<string, unknown> | null;
        allDecisions?: Record<string, unknown>[];
    }
): boolean {
    if (isTravelBanRequestWithdrawn(ed)) return false;
    if (ed?.debtor_travel_ban_active !== true) return false;
    const row = opts?.travelDecisionRow;
    const all = opts?.allDecisions ?? [];
    if (row && all.length > 0) {
        return isExecutorDecisionRowEffectivelyEnforced(row, all);
    }
    return false;
}

/** نتيجة قاضي البداءة الفعلية — من الملف أو صف القرار (بما فيه نقض التمييز) */
export function resolveExecutiveDetentionEffectiveJudgeOutcome(input: {
    executionData:
        | {
              executive_detention_judge_outcome?: 'approved' | 'rejected' | null;
              executive_detention_judge_decision_id?: string | null;
          }
        | null
        | undefined;
    decisionsExecutionId?: string;
}): 'approved' | 'rejected' | null {
    const ed = input.executionData;
    const stored = (ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null;
    const exId = String(input.decisionsExecutionId ?? '').trim();
    if (!exId) return stored;

    const judgeId = String(ed?.executive_detention_judge_decision_id ?? '').trim();
    const rows = readExecutorDecisionsArray(exId);
    let judgeRow: Record<string, unknown> | undefined;
    if (judgeId) {
        judgeRow = rows.find(
            (r) => String((r as { id?: string }).id ?? '').trim() === judgeId
        ) as Record<string, unknown> | undefined;
    }
    if (!judgeRow) {
        judgeRow = rows.find(
            (r) =>
                String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype ?? '') ===
                    'executive_detention_judge' &&
                !isExecutorHubRowSuperseded(r as Record<string, unknown>)
        ) as Record<string, unknown> | undefined;
    }
    return resolveExecutiveDetentionJudgeUiOutcome({ storedOutcome: stored, judgeRow });
}

/** مسار حبس نافذ — بعد موافقة/اعتبار قاضي البداءة فقط (لا عند تسليم الإضبارة وحدها) */
export function isExecutiveDetentionPathEnforceable(
    ed:
        | {
              executive_dossier_phase?: string | null;
              debtor_executive_detention_active?: boolean;
              executive_detention_until?: string | null;
              executive_detention_judge_outcome?: 'approved' | 'rejected' | null;
          }
        | null
        | undefined,
    detentionSuppressed: boolean,
    effectiveJudgeOutcome?: 'approved' | 'rejected' | null,
    opts?: {
        judgeDecisionRow?: Record<string, unknown> | null;
        allDecisions?: Record<string, unknown>[];
    }
): boolean {
    if (detentionSuppressed) return false;
    const judgeOutcome =
        effectiveJudgeOutcome ??
        ((ed?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null);
    if (judgeOutcome === 'rejected') return false;

    const pathOpen =
        isExecutiveDetentionPeriodActive(ed) || judgeOutcome === 'approved';
    if (!pathOpen) return false;

    const row = opts?.judgeDecisionRow;
    const all = opts?.allDecisions;
    if (row && Array.isArray(all) && all.length > 0) {
        return isExecutorDecisionRowEffectivelyEnforced(row, all);
    }
    return true;
}

function resolveExecutiveDetentionJudgeGoverningRow(
    allDecisions: Record<string, unknown>[],
    ed: {
        executive_detention_judge_decision_id?: string | null;
        executive_detention_judge_eligible_decision_id?: string | null;
    } | null | undefined,
    scope: { debtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const byId = String(ed?.executive_detention_judge_decision_id ?? '').trim();
    if (byId) {
        const hit = allDecisions.find(
            (r) => String((r as { id?: string }).id ?? '').trim() === byId
        );
        if (hit && !isExecutorHubRowSuperseded(hit)) return hit;
    }
    const dossierParentId = String(
        (
            getGoverningDossierPresentationRowFromDecisions(allDecisions, scope) as {
                id?: string;
            } | null
        )?.id ?? ''
    ).trim();
    const parentId = String(ed?.executive_detention_judge_eligible_decision_id ?? dossierParentId).trim();
    if (!parentId) return null;
    return (
        allDecisions.find(
            (r) =>
                String((r as { personalCoerciveSubtype?: string }).personalCoerciveSubtype ?? '') ===
                    'executive_detention_judge' &&
                String(
                    (r as { parentExecutorDecisionId?: string }).parentExecutorDecisionId ?? ''
                ).trim() === parentId &&
                !isExecutorHubRowSuperseded(r)
        ) ?? null
    );
}

export function resolvePrimaryDebtorCoerciveStack(args: {
    executionData: any;
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
