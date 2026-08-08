import { useCallback, useRef, useState } from 'react';
import { ExecutionSectionConfirmDialog } from './ExecutionSectionConfirmDialog';

type PendingConfirm = {
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    resolve: (accepted: boolean) => void;
};

/**
 * بديل Promise لـ window.confirm داخل قسم التنفيذ (webview / Capacitor).
 */
export function useExecutionSectionConfirm() {
    const [pending, setPending] = useState<PendingConfirm | null>(null);
    const pendingRef = useRef<PendingConfirm | null>(null);

    const settle = useCallback((accepted: boolean) => {
        const current = pendingRef.current;
        if (!current) return;
        pendingRef.current = null;
        setPending(null);
        current.resolve(accepted);
    }, []);

    const confirm = useCallback(
        (message: string, options?: { confirmLabel?: string; cancelLabel?: string }) =>
            new Promise<boolean>((resolve) => {
                const next: PendingConfirm = {
                    message,
                    confirmLabel: options?.confirmLabel,
                    cancelLabel: options?.cancelLabel,
                    resolve,
                };
                pendingRef.current = next;
                setPending(next);
            }),
        [],
    );

    const dialog = (
        <ExecutionSectionConfirmDialog
            open={Boolean(pending)}
            message={pending?.message ?? ''}
            confirmLabel={pending?.confirmLabel}
            cancelLabel={pending?.cancelLabel}
            onClose={() => settle(false)}
            onConfirm={() => settle(true)}
        />
    );

    return { confirm, dialog };
};
