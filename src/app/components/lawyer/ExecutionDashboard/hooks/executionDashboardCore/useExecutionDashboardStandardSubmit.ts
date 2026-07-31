import { useCallback, type SyntheticEvent } from 'react';

export type ExecutionDashboardSubmitToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    options?: {
        decisionsLink?: boolean;
        action?: { label: string; onClick: () => void };
    },
) => void;

export interface UseExecutionDashboardStandardSubmitParams {
    submit: () => void | boolean | Promise<void | boolean>;
    onClose: () => void;
    successMessage: string;
    showToast: ExecutionDashboardSubmitToast;
    validate?: () => boolean;
    validationMessage?: string;
    errorMessage?: string;
    getSuccessMessage?: () => string | undefined;
    getSuccessVariant?: () => 'success' | 'info' | 'warning';
    successToastOptions?: {
        decisionsLink?: boolean;
        action?: { label: string; onClick: () => void };
    };
}

export function useExecutionDashboardStandardSubmit({
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
}: UseExecutionDashboardStandardSubmitParams) {
    const runSubmit = useCallback(
        async (event?: SyntheticEvent) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
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

                const customMessage = getSuccessMessage?.();
                const message = (customMessage && customMessage.trim()) || successMessage;
                const variant = getSuccessVariant?.() ?? 'success';
                onClose();
                showToast(message, variant, successToastOptions);
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
        ],
    );

    return { runSubmit };
}

export const useStandardSubmit = useExecutionDashboardStandardSubmit;
