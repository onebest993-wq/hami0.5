import { useCallback } from 'react';

/** توقيع التوست المتوافق مع لوحة التنفيذ — بدون إعادة توجيه ضمن الـ hook */
export type StandardSubmitShowToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    options?: {
        decisionsLink?: boolean;
        action?: { label: string; onClick: () => void };
    }
) => void;

export interface UseStandardSubmitParams {
    /**
     * منطق الحفظ/الإرسال — لا يُفتح نوافذ أخرى ولا يُعاد التوجيه.
     * إن أعاد `false` صراحةً (بعد توست تحذيري داخلياً مثلاً) لا يُغلق ولا يُعرض توست النجاح.
     */
    submit: () => void | boolean | Promise<void | boolean>;
    /** إغلاق النافذة/الطبقة الحالية فقط بعد نجاح الإرسال */
    onClose: () => void;
    /** رسالة النجاح الافتراضية */
    successMessage: string;
    showToast: StandardSubmitShowToast;
    /** عند إرجاع false يُعرض تحذير ولا يُنفَّذ الإرسال ولا يُغلق */
    validate?: () => boolean;
    validationMessage?: string;
    errorMessage?: string;
    /**
     * إن وُجدت، تُستبدل رسالة النجاح الافتراضية عندما يعيد submit نصاً غير فارغ.
     * مفيد عندما يختلف نص التوست حسب فرع المنطق داخل submit.
     */
    getSuccessMessage?: () => string | undefined;
    getSuccessVariant?: () => 'success' | 'info' | 'warning';
    /** يُمرَّر إلى `showToast` عند نجاح الإرسال (مثل زر الانتقال إلى القرارات) */
    successToastOptions?: {
        decisionsLink?: boolean;
        action?: { label: string; onClick: () => void };
    };
}

/**
 * تغليف موحّد لعمليات الحفظ من النوافذ: منع تسرب الحدث، تنفيذ الإرسال، إغلاق النافذة الحالية، توست نجاح.
 * لا يُنفَّذ أي redirect ولا فتح نوافذ إضافية من داخل الـ hook.
 */
export function useStandardSubmit({
    submit,
    onClose,
    successMessage,
    showToast,
    validate,
    validationMessage = 'تحقق من البيانات المدخلة',
    errorMessage = 'تعذّر إكمال العملية',
    getSuccessMessage,
    getSuccessVariant,
    successToastOptions,
}: UseStandardSubmitParams) {
    const runSubmit = useCallback(
        async (e?: React.SyntheticEvent) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (validate && !validate()) {
                if (validationMessage?.trim()) {
                    showToast(validationMessage, 'warning', { decisionsLink: false });
                }
                return;
            }
            try {
                const out = await submit();
                if (out === false) return;
                const custom = getSuccessMessage?.();
                const msg = (custom && custom.trim()) || successMessage;
                const variant = getSuccessVariant?.() ?? 'success';
                onClose();
                showToast(msg, variant, successToastOptions);
            } catch {
                showToast(errorMessage, 'error', { decisionsLink: false });
            }
        },
        [
            submit,
            onClose,
            successMessage,
            showToast,
            validate,
            validationMessage,
            errorMessage,
            getSuccessMessage,
            getSuccessVariant,
            successToastOptions,
        ]
    );

    return { runSubmit };
}
