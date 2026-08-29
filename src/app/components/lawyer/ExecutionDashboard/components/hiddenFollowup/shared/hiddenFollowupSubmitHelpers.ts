/** أسباب تعطيل الإرسال المشتركة بين طلبات المتابعة المخفية */

export const HIDDEN_FOLLOWUP_LOCKED_REASON =
    'الوضع مقفل — لا يمكن إرسال طلب جديد.' as const;

export const HIDDEN_FOLLOWUP_PENDING_REASON =
    'يوجد طلب قيد البت لدى المنفذ.' as const;

export function resolveHiddenFollowupLockedReason(
    isHistoricalMode: boolean,
    coerciveUiLocked: boolean,
): string {
    if (isHistoricalMode || coerciveUiLocked) return HIDDEN_FOLLOWUP_LOCKED_REASON;
    return '';
}

export type HiddenFollowupToastFn = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    opts?: {
        decisionsLink?: boolean;
        decisionId?: string;
        decisionsTab?: 'current' | 'previous' | 'appeals';
    },
) => void;

/** إن وُجد سبب تعطيل → toast تحذيري؛ وإلا يفتح البوابة/الإرسال */
export function openHiddenFollowupSubmitOrWarn(
    submitDisabledReason: string,
    showToast: HiddenFollowupToastFn,
    open: () => void,
): void {
    if (submitDisabledReason) {
        showToast(submitDisabledReason, 'warning');
        return;
    }
    open();
}
