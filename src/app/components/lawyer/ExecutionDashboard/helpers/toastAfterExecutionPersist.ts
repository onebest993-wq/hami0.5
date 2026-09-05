import { isExecutionHandlerWaitTimeout } from '../hooks/executionHandlerClusterStubs';

function isThenable(value: unknown): value is Promise<boolean | void> {
    return Boolean(value) && typeof (value as { then?: unknown }).then === 'function';
}

/**
 * بعد persistExecutionMerge: لا تعلن نجاحاً إن رُفض الدمج فوراً (حراسة/تعقيم/لا ملف).
 * فشل القرص المؤجّل (ui-first) يُبلَّغ عبر reportPersistFailure في المحوّل.
 * إن رجع الدمج وعداً (انتظار المعالج الحي) يُؤجَّل التوست حتى اكتماله.
 */
export function toastAfterExecutionPersist(
    persisted: boolean | void | Promise<boolean | void>,
    showToast: (message: string, type?: 'error' | 'info' | 'warning' | 'success' | string) => void,
    successMessage: string,
    failMessage = 'تعذّر الحفظ — أعد المحاولة',
): boolean {
    if (isThenable(persisted)) {
        void persisted.then((value) => {
            toastAfterExecutionPersist(value, showToast, successMessage, failMessage);
        });
        return true;
    }
    if (isExecutionHandlerWaitTimeout(persisted)) {
        return false;
    }
    if (persisted === false) {
        showToast(failMessage, 'error');
        return false;
    }
    showToast(successMessage, 'success');
    return true;
}
