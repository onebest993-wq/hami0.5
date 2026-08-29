import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    isCoarsePointerDevice,
    useVisualViewportFixedBox,
} from '@/app/hooks/useVisualViewportFixedBox';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type UseEventFormOverlayParams = {
    show: boolean;
    saving: boolean;
    onClose: () => void;
    titleInputId: string;
};

export function useEventFormOverlay({
    show,
    saving,
    onClose,
    titleInputId,
}: UseEventFormOverlayParams): {
    viewport: ReturnType<typeof useVisualViewportFixedBox>;
    panelRef: RefObject<HTMLDivElement | null>;
    fieldsRef: RefObject<HTMLDivElement | null>;
    keyboardResizeGuardUntilRef: RefObject<number>;
    openNativePicker: (target: HTMLInputElement) => void;
    onKeyDownCapture: (e: ReactKeyboardEvent) => void;
} {
    const panelRef = useRef<HTMLDivElement>(null);
    const fieldsRef = useRef<HTMLDivElement>(null);
    const keyboardResizeGuardUntilRef = useRef(0);
    const viewport = useVisualViewportFixedBox(show);

    useBodyScrollLock(show);

    useEffect(() => {
        if (!show || !viewport.keyboardOpen) return;
        keyboardResizeGuardUntilRef.current = Date.now() + 320;
    }, [show, viewport.keyboardOpen]);

    useEffect(() => {
        if (!show) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || saving) return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [show, saving, onClose]);

    useEffect(() => {
        if (!show || isCoarsePointerDevice()) return;
        const frame = requestAnimationFrame(() => {
            panelRef.current
                ?.querySelector<HTMLInputElement>(`#${titleInputId}`)
                ?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(frame);
    }, [show, titleInputId]);

    useEffect(() => {
        if (!show) return;
        const onFocusIn = (e: FocusEvent) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            if (!fieldsRef.current?.contains(target)) return;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
                return;
            }
            requestAnimationFrame(() => {
                try {
                    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
                } catch {
                    target.scrollIntoView(true);
                }
            });
        };
        document.addEventListener('focusin', onFocusIn);
        return () => document.removeEventListener('focusin', onFocusIn);
    }, [show]);

    const openNativePicker = (target: HTMLInputElement) => {
        if (typeof target.showPicker === 'function') {
            try {
                target.showPicker();
            } catch {
                /* ignore unsupported picker behavior */
            }
        }
    };

    const onKeyDownCapture = (e: ReactKeyboardEvent) => {
        if (e.key !== 'Tab' || !panelRef.current) return;
        const focusables = Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
            if (active === first || !panelRef.current.contains(active)) {
                e.preventDefault();
                last.focus();
            }
        } else if (active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return {
        viewport,
        panelRef,
        fieldsRef,
        keyboardResizeGuardUntilRef,
        openNativePicker,
        onKeyDownCapture,
    };
}
