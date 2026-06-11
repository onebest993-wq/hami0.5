import {
    getDossierPresentationOutcome,
    getGoverningDossierPresentationRow,
    getPersonalCoerciveSubtypeOutcome,
    hasActivePersonalCoerciveSubtypeCard,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

type PersonalCoerciveQueueState = ReturnType<typeof getPersonalCoerciveSubtypeOutcome>;

/** إغلاق دورة التنفيذ الجبري (إخلاء سبيل) — تُخفى شارات الطلبات من القرارات */
export function isPersonalCoerciveCycleClosed(
    ed: { personal_coercive_cycle_closed_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.personal_coercive_cycle_closed_at ?? '').trim());
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
    if (!opts.travelCycleActive && ed?.debtor_travel_ban_active !== true) return true;
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

/** اكتمال دورة الإحضار الجبري — يعتمد على نتيجة صريحة فقط (لا يخلط مع الحضور الطوعي) */
export function isForcedBringCycleResolved(
    ed: {
        forced_bring_in_personal_outcome?: string | null;
        forced_bring_in_personal_followup_logged?: boolean;
        debtorForcedToAttend?: boolean;
    } | null | undefined
): boolean {
    const o = String(ed?.forced_bring_in_personal_outcome ?? '').trim();
    if (o === 'brought' || o === 'absconded') return true;
    if (ed?.debtorForcedToAttend === true && ed?.forced_bring_in_personal_followup_logged === true) {
        return true;
    }
    return false;
}

export function isInvestigationCourtWithdrawn(
    ed: { investigation_court_withdrawn_at?: string | null } | null | undefined
): boolean {
    return Boolean(String(ed?.investigation_court_withdrawn_at ?? '').trim());
}

/** هل يُعرض محضر «تسجيل نتيجة الإحضار الجبري» بعد موافقة المنفذ */
export function resolveForcedBringNeedsOutcomeUi(input: {
    forcedApproved: boolean;
    forcedPending: boolean;
    outcome?: string | null;
    /** طعن/تظلم يوقف التنفيذ الميداني — لا تسجيل نتيجة */
    appealBlocksFieldwork?: boolean;
}): boolean {
    if (input.appealBlocksFieldwork) return false;
    if (!input.forcedApproved || input.forcedPending) return false;
    const o = String(input.outcome ?? '').trim();
    return o !== 'brought' && o !== 'absconded';
}

/** اكتمال مسار مفاتحة التحقيق ميدانياً — لا يُعاد فتح الإحضار الجبري تلقائياً */
export function isInvestigationCoerciveLaneSettled(
    ed:
        | {
              investigationPathDebtorPresent?: boolean;
              debtor_arrest_warrant_cleared_after_custody?: boolean;
          }
        | null
        | undefined
): boolean {
    return (
        ed?.investigationPathDebtorPresent === true ||
        ed?.debtor_arrest_warrant_cleared_after_custody === true
    );
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

/** منع سفر نافذ — يتزامن مع debtor_travel_ban_active بعد موافقة المنفذ */
export function isTravelBanEnforceable(
    ed: { debtor_travel_ban_active?: boolean; travel_ban_withdrawn_at?: string | null } | null | undefined
): boolean {
    if (isTravelBanRequestWithdrawn(ed)) return false;
    return ed?.debtor_travel_ban_active === true;
}

/** مسار حبس/عرض إضبارة نافذ — لا يُربط بطلب قيد البت */
export function isExecutiveDetentionPathEnforceable(
    ed:
        | {
              executive_dossier_phase?: string | null;
              debtor_executive_detention_active?: boolean;
              executive_detention_until?: string | null;
          }
        | null
        | undefined,
    detentionSuppressed: boolean
): boolean {
    if (detentionSuppressed) return false;
    if (isExecutiveDetentionPeriodActive(ed)) return true;
    const phase = String(ed?.executive_dossier_phase ?? '').trim();
    return phase === 'handed_to_judge' || phase === 'judge_decided' || phase === 'detention_active';
}

/** إظهار بطاقة مفاتحة محكمة التحقيق — تُخفى بعد إتمام الدورة (حضور أو تأمين إحضار) حتى يُعاد «متخفي» من الإحضار الجبري */
export function shouldShowInvestigationCourtBlock(
    ed: {
        forced_bring_in_personal_outcome?: string | null;
        investigation_court_withdrawn_at?: string | null;
        personal_arrest_investigation_session_open?: boolean;
        personal_arrest_warrant_stage?: string | null;
        debtor_wanted_arrest_warrant?: boolean;
        investigationCourtRequested?: boolean;
        investigationPathDebtorPresent?: boolean;
        debtor_arrest_warrant_cleared_after_custody?: boolean;
    } | null | undefined,
    arrestSt: { pending: boolean; approved: boolean; alternative: boolean } | null
): boolean {
    if (isInvestigationCourtWithdrawn(ed)) return false;
    if (isInvestigationCoerciveLaneSettled(ed)) return false;
    if (ed?.investigationPathDebtorPresent === true) return false;
    if (ed?.debtor_arrest_warrant_cleared_after_custody === true) return false;

    const outcome = String(ed?.forced_bring_in_personal_outcome ?? '').trim();
    /** المفاتحة لا تُعرض إلا بعد تسجيل «متخفي عن الأنظار» في الإحضار الجبري */
    if (outcome !== 'absconded') return false;

    if (ed?.investigationCourtRequested === true) return true;
    if (arrestSt?.pending || arrestSt?.approved || arrestSt?.alternative) return true;
    const stage = String(ed?.personal_arrest_warrant_stage ?? 'none').trim();
    if (ed?.debtor_wanted_arrest_warrant === true) return true;
    if (stage !== 'none' && stage !== '') return true;
    if (ed?.personal_arrest_investigation_session_open === true) return true;
    return true;
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

    const showForcedAttendance =
        !showArrestWarrantBadge &&
        !forcedBringResolved &&
        (Boolean(args.forcedAttendancePending) || forcedNeedsOutcome);

    const hasTravelBanUi = isTravelBanEnforceable(ed);

    const hasDetentionUi =
        isExecutiveDetentionPathEnforceable(ed, detentionSuppressed) &&
        ed?.executive_detention_judge_outcome !== 'rejected';

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

    const travelCycleActive = hasActivePersonalCoerciveSubtypeCard(exId, 'travel_ban', scope);
    if (
        !travelCycleActive &&
        ed?.debtor_travel_ban_active === true &&
        !isTravelBanRequestWithdrawn(ed as { travel_ban_withdrawn_at?: string | null })
    ) {
        patch.debtor_travel_ban_active = false;
    }

    const dossierCycleActive = Boolean(getGoverningDossierPresentationRow(exId, scope));
    const detentionActive = isExecutiveDetentionPeriodActive(
        ed as { debtor_executive_detention_active?: boolean; executive_detention_until?: string | null }
    );
    const dossierPhase = String(ed?.executive_dossier_phase ?? '').trim();
    const dossierPathOpen =
        dossierPhase === 'handed_to_judge' ||
        dossierPhase === 'judge_decided' ||
        dossierPhase === 'detention_active';
    if (!dossierCycleActive && !detentionActive && !dossierPathOpen) {
        if (ed?.executive_dossier_phase != null && ed.executive_dossier_phase !== undefined) {
            patch.executive_dossier_phase = null;
        }
        if (ed?.executive_detention_judge_outcome != null && ed.executive_detention_judge_outcome !== undefined) {
            patch.executive_detention_judge_outcome = null;
        }
        if (String(ed?.executive_detention_judge_eligible_decision_id ?? '').trim()) {
            patch.executive_detention_judge_eligible_decision_id = null;
        }
        if (String(ed?.executive_detention_judge_decision_id ?? '').trim()) {
            patch.executive_detention_judge_decision_id = null;
        }
        if (String(ed?.executive_detention_judge_rejection_reason ?? '').trim()) {
            patch.executive_detention_judge_rejection_reason = null;
        }
    }

    return Object.keys(patch).length > 0 ? patch : null;
}
