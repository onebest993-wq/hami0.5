import { useEffect, useCallback, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useProfileSettingsFocusTrap(
    open: boolean,
    sheetRef: RefObject<HTMLDivElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onClose]);

    const onKeyDownCapture = useCallback(
        (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !sheetRef.current) return;
            const root = sheetRef.current;
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
        [sheetRef],
    );

    return { onKeyDownCapture };
}
