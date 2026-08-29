import { useCallback, useEffect, type KeyboardEvent, type RefObject } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useNotificationFocusTrap(
    isOpen: boolean,
    panelRef: RefObject<HTMLDivElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            onClose();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !panelRef.current) return;
        const root = panelRef.current;

        const onFocusIn = (e: FocusEvent) => {
            const target = e.target;
            if (!(target instanceof Node) || root.contains(target)) return;
            e.stopPropagation();
            const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (el) => el.offsetParent !== null,
            );
            focusables[0]?.focus();
        };

        document.addEventListener('focusin', onFocusIn, true);
        const first = root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        const focusRaf = requestAnimationFrame(() => {
            first?.focus({ preventScroll: true });
        });

        return () => {
            cancelAnimationFrame(focusRaf);
            document.removeEventListener('focusin', onFocusIn, true);
        };
    }, [isOpen, panelRef]);

    const onKeyDownCapture = useCallback(
        (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !panelRef.current) return;
            const root = panelRef.current;
            const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
                (el) => el.offsetParent !== null,
            );
            if (focusables.length === 0) return;
            const first = focusables[0]!;
            const last = focusables[focusables.length - 1]!;
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey) {
                if (active === first || !root.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last) {
                e.preventDefault();
                first.focus();
            }
        },
        [panelRef],
    );

    return { onKeyDownCapture };
}
