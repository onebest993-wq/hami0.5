export function isExecutorRowAppealOverturned(row: Record<string, unknown>): boolean {
    return String((row as { appealStatus?: string }).appealStatus || '') === 'overturned';
}

/** نتيجة طعن/تمييز نقضت رفض الطلب فعلياً (الطلب صار مقبولاً وليس مجرد حقل appealResult عالقاً) */
export function executorRowAppealOverturnsRejection(row: Record<string, unknown>): boolean {
    if (isExecutorRowAppealOverturned(row)) return true;
    const result = String((row as { appealResult?: string }).appealResult || '').trim();
    if (result !== 'نقض القرار') return false;
    const outcome = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (outcome === 'approved' || outcome === 'alternative') return true;
    const ws = String((row as { appealWorkflowState?: string }).appealWorkflowState || '').trim();
    if (ws === 'FINAL_ACCEPTED' || ws === 'REVOKED_BY_APPEAL') return true;
    const appealStatus = String((row as { appealStatus?: string }).appealStatus || '').trim();
    return appealStatus === 'final' && outcome === 'rejected';
}

/** موافقة فعلية: موافقة المنفذ أو بديله، أو رفض أُلغي بنقض */
export function isExecutorRowEffectivelyApproved(row: Record<string, unknown>): boolean {
    const o = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (o === 'approved') return true;
    if (o === 'rejected' && executorRowAppealOverturnsRejection(row)) return true;
    return false;
}

/** رفض ما زال سارياً (لم يُنقض) */
export function isExecutorRowRejectedAndFinal(row: Record<string, unknown>): boolean {
    const o = String((row as { executorOutcome?: string }).executorOutcome || '');
    if (o !== 'rejected') return false;
    return !executorRowAppealOverturnsRejection(row);
}
