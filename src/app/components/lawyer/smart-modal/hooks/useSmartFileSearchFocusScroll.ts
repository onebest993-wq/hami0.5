import { useEffect, useRef } from 'react';

const FOCUS_CLASS = [
    'ring-1',
    'ring-[#E6C673]/45',
    'bg-[#E6C673]/[0.06]',
    'shadow-[inset_0_0_0_1px_rgba(230,198,115,0.22)]',
    'transition-[box-shadow,background-color] duration-300',
] as const;

/** Deep-link scroll + glass highlight for Global Search event focus. */
export function useSmartFileSearchFocusScroll(file: Record<string, unknown>) {
    const searchFocusEventIdRef = useRef<string | null>(
        typeof file.__searchFocusEventId === 'string' && file.__searchFocusEventId
            ? String(file.__searchFocusEventId)
            : null,
    );

    useEffect(() => {
        const targetId = searchFocusEventIdRef.current;
        if (!targetId || typeof document === 'undefined') return;
        searchFocusEventIdRef.current = null;

        let cleared = false;
        let clearTimer = 0;
        let attempt = 0;

        const tryFocus = () => {
            if (cleared) return;
            const el = document.querySelector(`[data-event-id="${CSS.escape(targetId)}"]`);
            if (!el) {
                if (attempt < 8) {
                    attempt += 1;
                    window.setTimeout(tryFocus, 90 + attempt * 40);
                }
                return;
            }
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add(...FOCUS_CLASS);
                clearTimer = window.setTimeout(() => {
                    el.classList.remove(...FOCUS_CLASS);
                }, 1800);
            } catch {
                /* element may not support scroll/highlight */
            }
        };

        const startTimer = window.setTimeout(() => {
            requestAnimationFrame(() => requestAnimationFrame(tryFocus));
        }, 120);

        return () => {
            cleared = true;
            window.clearTimeout(startTimer);
            if (clearTimer) window.clearTimeout(clearTimer);
        };
    }, []);
}
