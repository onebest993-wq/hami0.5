import { memo, useEffect, useRef, type ReactNode } from 'react';
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

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listFocusable(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
}

/**
 * حوار مركزي داخل hub المعاملات.
 * بدون Radix focus-trap (كان يجمّد الواجهة) — إدارة تركيز خفيفة محلية:
 * Escape للإغلاق + تدوير Tab داخل الحوار فقط.
 */
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
    const panelRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;

        previouslyFocusedRef.current =
            typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;

        const panel = panelRef.current;
        const focusInitial = () => {
            if (!panel) return;
            const focusables = listFocusable(panel);
            (focusables[0] ?? panel).focus();
        };
        const raf = window.requestAnimationFrame(focusInitial);

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onOpenChange(false);
                return;
            }
            if (event.key !== 'Tab' || !panel) return;
            const focusables = listFocusable(panel);
            if (focusables.length === 0) {
                event.preventDefault();
                panel.focus();
                return;
            }
            const first = focusables[0]!;
            const last = focusables[focusables.length - 1]!;
            const active = document.activeElement;
            if (event.shiftKey) {
                if (active === first || !panel.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !panel.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('keydown', onKeyDown, true);
            const prev = previouslyFocusedRef.current;
            if (prev && typeof prev.focus === 'function') {
                try {
                    prev.focus();
                } catch {
                    /* ignore */
                }
            }
        };
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
                <div
                    ref={panelRef}
                    tabIndex={-1}
                    className="pointer-events-auto w-full max-w-lg outline-none"
                >
                    {children}
                </div>
            </div>
        </div>,
        getTransactionsHubDialogPortalRoot(),
    );
});
