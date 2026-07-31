import { useEffect, useState } from 'react';

/**
 * يؤجّل الحسابات الثقيلة حتى بعد أول paint لإطار الإضبارة (هيكل/أنيميشن الدخول).
 * double-rAF + macrotask يمنح المتصفح فرصة رسم الهيكل قبل حلقات الدين/الذمة.
 */
export function usePostEntryHeavyComputeReady(enabled = true): boolean {
    const [ready, setReady] = useState(() => !enabled);

    useEffect(() => {
        if (!enabled) {
            setReady(true);
            return;
        }

        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let raf2 = 0;

        const markReady = () => {
            if (!cancelled) setReady(true);
        };

        if (typeof requestAnimationFrame === 'undefined') {
            timeoutId = setTimeout(markReady, 0);
            return () => {
                cancelled = true;
                if (timeoutId !== undefined) clearTimeout(timeoutId);
            };
        }

        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                timeoutId = setTimeout(markReady, 0);
            });
        });

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
            if (timeoutId !== undefined) clearTimeout(timeoutId);
        };
    }, [enabled]);

    return ready;
}
