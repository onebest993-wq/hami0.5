import { memo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { TX_HUB_DIALOG_Z } from './transactionsHubOverlayZ';

function getTransactionsHubDialogPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({
        id: 'hami-transactions-thread-modal-root',
        zIndex: TX_HUB_DIALOG_Z,
    });
}

/** حوار مركزي داخل hub المعاملات — بدون focus trap لـ Radix الذي يجمّد الواجهة */
export const TransactionsHubDialog = memo(function TransactionsHubDialog({
    open,
    onOpenChange,
    children,
    testId,
    ariaLabel,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
    testId?: string;
    ariaLabel?: string;
}) {
    const reduceMotion = useReduceMotion();

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onOpenChange(false);
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onOpenChange, open]);

    if (!open || typeof document === 'undefined') return null;

    const backdropMotion = reduceMotion ? '!transition-none' : 'transition-opacity duration-75 ease-out';

    return createPortal(
        <div
            className="fixed inset-0 z-[230] pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            data-testid={testId}
            data-state="open"
        >
            <button
                type="button"
                aria-label="إغلاق"
                className={`absolute inset-0 bg-black/50 ${backdropMotion}`}
                onClick={() => onOpenChange(false)}
            />
            <div className="pointer-events-none fixed inset-0 z-[231] flex items-center justify-center p-4">
                <div className="pointer-events-auto w-full max-w-lg">{children}</div>
            </div>
        </div>,
        getTransactionsHubDialogPortalRoot(),
    );
});
