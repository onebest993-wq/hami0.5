import { useEffect, useRef } from 'react';

/** Deep-link scroll + highlight for Global Search event focus. */
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
        const t = window.setTimeout(() => {
            const el = document.querySelector(`[data-event-id="${CSS.escape(targetId)}"]`);
            if (!el) return;
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-[#E6C673]', 'ring-offset-2', 'ring-offset-transparent');
                window.setTimeout(() => {
                    el.classList.remove(
                        'ring-2',
                        'ring-[#E6C673]',
                        'ring-offset-2',
                        'ring-offset-transparent',
                    );
                }, 2200);
            } catch {
                /* element may not support scroll/highlight */
            }
        }, 320);
        return () => window.clearTimeout(t);
    }, []);
}
