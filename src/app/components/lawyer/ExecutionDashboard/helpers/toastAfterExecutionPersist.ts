/**
 * بعد persistExecutionMerge: لا تعلن نجاحاً إن رُفض الدمج فوراً (حراسة/تعقيم/لا ملف).
 * فشل القرص المؤجّل (ui-first) يُبلَّغ عبر reportPersistFailure في المحوّل.
 */
export function toastAfterExecutionPersist(
    persisted: boolean | void,
    showToast: (message: string, type?: string) => void,
    successMessage: string,
    failMessage = 'تعذّر الحفظ — أعد المحاولة',
): boolean {
    if (persisted === false) {
        showToast(failMessage, 'error');
        return false;
    }
    showToast(successMessage, 'success');
    return true;
}
