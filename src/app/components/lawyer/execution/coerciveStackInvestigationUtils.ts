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

/** مذكرة قبض نافذة — صدور الأمر فقط، لا عند تقديم مفاتحة التحقيق أو قيد البت */
export function isArrestWarrantEnforceable(
    ed:
        | {
              debtor_wanted_arrest_warrant?: boolean;
              personal_arrest_warrant_stage?: string | null;
              debtor_arrest_warrant_cleared_after_custody?: boolean;
          }
        | null
        | undefined,
): boolean {
    if (ed?.debtor_arrest_warrant_cleared_after_custody === true) return false;
    if (ed?.debtor_wanted_arrest_warrant === true) return true;
    return String(ed?.personal_arrest_warrant_stage ?? '').trim() === 'issued';
}
