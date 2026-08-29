import { useEffect, useCallback, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listFocusables(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
        if (el.getAttribute('aria-hidden') === 'true') return false;
        /* jsdom غالباً offsetParent=null — اكتفِ بالاتصال + عدم display:none إن وُجد */
        if (el.offsetParent !== null) return true;
        if (!el.isConnected) return false;
        try {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
        } catch {
            /* ignore */
        }
        return true;
    });
}

export function trapTabInRoot(
    e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>,
    root: HTMLElement,
) {
    if (e.key !== 'Tab') return;
    const focusables = listFocusables(root);
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
        }
    } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
    }
}

export function useProfileSettingsFocusTrap(
    open: boolean,
    sheetRef: RefObject<HTMLDivElement | null>,
    onClose: () => void,
    options?: { closeEnabled?: boolean; trapTab?: boolean },
) {
    const closeEnabled = options?.closeEnabled !== false;
    const trapTab = options?.trapTab !== false;

    useEffect(() => {
        if (!open) return;
        const root = sheetRef.current;
        const focusables = root ? listFocusables(root) : [];
        const initial =
            focusables.find((el) => el.getAttribute('data-testid') !== 'profile-settings-close') ??
            focusables[0];
        if (initial) {
            window.requestAnimationFrame(() => initial.focus());
        }
    }, [open, sheetRef]);

    useEffect(() => {
        if (!open) return;

        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (!closeEnabled) return;
                e.preventDefault();
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.key !== 'Tab' || !trapTab) return;
            const sheet = sheetRef.current;
            if (!sheet) return;
            /* نافذة كاملة — لا تعتمد على فوكس داخل الورقة فقط */
            trapTabInRoot(e, sheet);
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onClose, sheetRef, closeEnabled, trapTab]);

    const onKeyDownCapture = useCallback(
        (e: KeyboardEvent) => {
            if (!trapTab) return;
            const root = sheetRef.current;
            if (!root) return;
            trapTabInRoot(e, root);
        },
        [sheetRef, trapTab],
    );

    return { onKeyDownCapture };
}
