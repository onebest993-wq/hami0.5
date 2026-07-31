/**
 * إحلال الورثة بعد موافقة المنفذ يتوقف أثناء مسار التظلم/التمييز،
 * ويُلغى أثر المتابعة عند إبطال القرار بالطعن (أو انتهاء مهلة التمييز بلا طعن).
 */

export type HeirSubstitutionAppealGateRow = {
    appealStatus?: string | null;
    appealPhase?: string | null;
    appealWorkflowState?: string | null;
    awaitingCassationEntryBy?: string | null;
    grievanceRejectedAwaitingTamyeez?: boolean;
    grievanceAcceptedAwaitingDebtorTamyeez?: boolean;
};

/** يمنع زر «فتح بيانات الورثة» ومتابعة الإدراج أثناء طعن مادّي أو انتظار تمييز */
export function isHeirSubstitutionFollowupBlockedByAppeal(
    row: HeirSubstitutionAppealGateRow | null | undefined,
): boolean {
    if (!row) return false;
    const ws = String(row.appealWorkflowState || '').trim();
    if (ws === 'REVOKED_BY_APPEAL') return true;
    if (ws === 'PENDING_APPEAL_LAWYER' || ws === 'PENDING_APPEAL_DEBTOR') return true;

    const status = String(row.appealStatus || '').trim();
    if (status === 'tadhallum_filed' || status === 'tamyeez_filed') return true;

    const phase = String(row.appealPhase || '').trim();
    if (phase === 'grievance' || phase === 'cassation') return true;

    if (row.awaitingCassationEntryBy) return true;
    if (row.grievanceAcceptedAwaitingDebtorTamyeez) return true;
    if (row.grievanceRejectedAwaitingTamyeez) return true;

    return false;
}
