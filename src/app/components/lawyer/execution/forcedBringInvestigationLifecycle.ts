/**
 * محرك دورة الإحضار الجبري → مفاتحة التحقيق → مذكرة القبض
 * مصدر حقيقة واحد لكل أنواع التنفيذ (غير مسار تكليف الموظف المنفصل).
 *
 * الدورة:
 * 1) طلب إحضار جبري (طلب دائن أو بقرار المنفذ) → موافقة المنفذ
 * 2) نتيجة: حضور | تجاهل | متخفي
 *    - حضور / تجاهل → إعادة دورة الإحضار من الصفر
 *    - متخفي → إخفاء بطاقة الإحضار وإظهار مفاتحة محكمة التحقيق
 * 3) مفاتحة → موافقة المنفذ → حضور (إعادة كاملة) | إصدار مذكرة قبض
 * 4) بعد المذكرة → خيار واحد: تم تأمين إحضار المدين → إعادة دورة الإحضار
 */

export type ForcedBringPersonalOutcome = 'brought' | 'absconded' | 'dismissed';

export type ForcedBringUiPhase =
    | 'hidden'
    | 'start'
    | 'executor_pending'
    | 'outcome_choice'
    | 'followup_blocked'
    | 'rejected';

export type InvestigationUiPhase =
    | 'hidden'
    | 'send_request'
    | 'executor_pending'
    | 'outcome_choice'
    | 'warrant_custody'
    | 'followup_blocked'
    | 'rejected';

/** تصفير كامل لدورة الإحضار + المفاتحة لإتاحة طلب إحضار جديد */
export function buildForcedBringLifecycleRestartBase(): Record<string, unknown> {
    return {
        forcedAttendanceIssued: false,
        activeNoticeState: null,
        forced_bring_in_personal_outcome: null,
        forced_bring_in_personal_followup_logged: false,
        investigationCourtRequested: false,
        investigationMemoIssued: false,
        investigationPathDebtorPresent: false,
        personal_arrest_investigation_session_open: false,
        personal_arrest_warrant_stage: 'none',
        debtor_wanted_arrest_warrant: false,
        debtor_arrest_warrant_cleared_after_custody: false,
        investigation_court_withdrawn_at: null,
        debtorEvaded: false,
    };
}

/** نتيجة الإحضار بعد موافقة المنفذ */
export function buildForcedBringPersonalOutcomePatch(
    v: ForcedBringPersonalOutcome,
): Record<string, unknown> {
    if (v === 'brought') {
        return {
            ...buildForcedBringLifecycleRestartBase(),
            debtorForcedToAttend: true,
            debtorAttendedVoluntarily: true,
        };
    }
    if (v === 'dismissed') {
        return {
            ...buildForcedBringLifecycleRestartBase(),
            debtorForcedToAttend: false,
            debtorAttendedVoluntarily: false,
        };
    }
    /** متخفي: تُخفى بطاقة الإحضار وتُفتح بوابة المفاتحة — الطلب يُرسل من الواجهة */
    return {
        forced_bring_in_personal_outcome: 'absconded',
        forced_bring_in_personal_followup_logged: true,
        forcedAttendanceIssued: false,
        activeNoticeState: null,
        debtorEvaded: true,
        debtorAttendedVoluntarily: false,
        investigationPathDebtorPresent: false,
        debtor_arrest_warrant_cleared_after_custody: false,
        personal_arrest_warrant_stage: 'none',
        personal_arrest_investigation_session_open: true,
        /** يُضبط true عند إرسال/موافقة طلب المفاتحة — لا نستبق قرار المنفذ */
        investigationCourtRequested: false,
        investigation_court_withdrawn_at: null,
    };
}

/** حضور المدين بعد موافقة المفاتحة — إعادة دورة الإحضار كاملة */
export function buildInvestigationDebtorAttendedPatch(): Record<string, unknown> {
    return {
        ...buildForcedBringLifecycleRestartBase(),
        debtorForcedToAttend: true,
        debtorAttendedVoluntarily: true,
    };
}

/** إصدار مذكرة قبض بعد موافقة المفاتحة */
export function buildInvestigationWarrantIssuedPatch(): Record<string, unknown> {
    return {
        personal_arrest_warrant_stage: 'issued',
        debtor_wanted_arrest_warrant: true,
        debtor_arrest_warrant_cleared_after_custody: false,
        personal_arrest_investigation_session_open: false,
        investigationCourtRequested: true,
        investigation_court_withdrawn_at: null,
    };
}

/** تم تأمين إحضار المدين بعد المذكرة — إعادة دورة الإحضار */
export function buildInvestigationSecuredBringPatch(): Record<string, unknown> {
    return {
        ...buildForcedBringLifecycleRestartBase(),
        debtor_arrest_warrant_cleared_after_custody: true,
        debtorArrested: true,
        debtorForcedToAttend: true,
        debtorAttendedVoluntarily: true,
    };
}

export function isForcedBringAbsconded(
    ed:
        | {
              forced_bring_in_personal_outcome?: string | null;
              debtorEvaded?: boolean;
          }
        | null
        | undefined,
): boolean {
    const o = String(ed?.forced_bring_in_personal_outcome ?? '').trim();
    return o === 'absconded' || ed?.debtorEvaded === true;
}

/** هل اكتملت دورة الإحضار (متخفي يفتح المفاتحة؛ حضور/تجاهل في البيانات القديمة) */
export function isForcedBringCycleResolved(
    ed: {
        forced_bring_in_personal_outcome?: string | null;
        forced_bring_in_personal_followup_logged?: boolean;
        debtorForcedToAttend?: boolean;
    } | null | undefined,
): boolean {
    const o = String(ed?.forced_bring_in_personal_outcome ?? '').trim();
    if (o === 'absconded') return true;
    if (o === 'brought' || o === 'dismissed') return true;
    if (ed?.debtorForcedToAttend === true && ed?.forced_bring_in_personal_followup_logged === true) {
        return true;
    }
    return false;
}

export function resolveForcedBringNeedsOutcomeUi(input: {
    forcedApproved: boolean;
    forcedPending: boolean;
    outcome?: string | null;
    appealBlocksFieldwork?: boolean;
    appealCycleSuperseded?: boolean;
}): boolean {
    if (input.appealBlocksFieldwork) return false;
    if (input.appealCycleSuperseded) return false;
    if (!input.forcedApproved || input.forcedPending) return false;
    const o = String(input.outcome ?? '').trim();
    return o !== 'brought' && o !== 'absconded' && o !== 'dismissed';
}

export function isInvestigationLaneSettled(
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

/** بطاقة المفاتحة تظهر فقط بعد «متخفي» وطالما لم تُغلق الدورة */
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
        debtorEvaded?: boolean;
    } | null | undefined,
    arrestSt: { pending: boolean; approved: boolean; alternative: boolean } | null,
): boolean {
    if (Boolean(String(ed?.investigation_court_withdrawn_at ?? '').trim())) return false;
    if (isInvestigationLaneSettled(ed)) return false;
    if (!isForcedBringAbsconded(ed)) return false;
    if (arrestSt?.pending || arrestSt?.approved || arrestSt?.alternative) return true;
    if (ed?.investigationCourtRequested === true) return true;
    if (ed?.debtor_wanted_arrest_warrant === true) return true;
    const stage = String(ed?.personal_arrest_warrant_stage ?? 'none').trim();
    if (stage !== 'none' && stage !== '') return true;
    if (ed?.personal_arrest_investigation_session_open === true) return true;
    return true;
}

/** بطاقة الإحضار تبقى ظاهرة بعد «متخفي» — المسار يُتابع من مفاتحة التحقيق دون إخفاء البطاقة */
export function shouldShowForcedBringCard(input: {
    showEmbedded: boolean;
    absconded?: boolean;
}): boolean {
    return input.showEmbedded;
}

export function resolveForcedBringUiPhase(input: {
    showCard: boolean;
    pending: boolean;
    rejected: boolean;
    alternative: boolean;
    needsOutcome: boolean;
    followupBlocked: boolean;
    blocksFieldwork: boolean;
}): ForcedBringUiPhase {
    if (!input.showCard) return 'hidden';
    if (input.followupBlocked || input.blocksFieldwork) return 'followup_blocked';
    if (input.pending) return 'executor_pending';
    if (input.needsOutcome) return 'outcome_choice';
    if (input.rejected) return 'rejected';
    if (input.alternative) return 'start';
    return 'start';
}

export function resolveInvestigationUiPhase(input: {
    showCard: boolean;
    pending: boolean;
    rejected: boolean;
    approved: boolean;
    alternative: boolean;
    followupBlocked: boolean;
    blocksFieldwork: boolean;
    postApprovalActive: boolean;
    warrantIssued: boolean;
    warrantCustodyRecorded: boolean;
}): InvestigationUiPhase {
    if (!input.showCard) return 'hidden';
    if (input.followupBlocked) return 'followup_blocked';
    if (input.pending) return 'executor_pending';
    if (input.rejected && !input.approved) return 'rejected';
    if (input.warrantCustodyRecorded) return 'hidden';
    if (input.postApprovalActive) {
        if (input.warrantIssued) return 'warrant_custody';
        return 'outcome_choice';
    }
    if (input.approved || input.alternative) {
        if (input.warrantIssued) return 'warrant_custody';
        return 'outcome_choice';
    }
    return 'send_request';
}
