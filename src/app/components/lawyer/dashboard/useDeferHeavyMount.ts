import { useEffect, useState } from 'react';

/**
 * يؤجّل الشجرة الثقيلة حتى إطارَي رسم — بدون startTransition
 * (كان يؤجّل إلى ما لا نهاية تحت ضغط فتح الأرشيف).
 */
export function useDeferHeavyMount(enabled = true): boolean {
    const [ready, setReady] = useState(() => !enabled);

    useEffect(() => {
        if (!enabled) {
            setReady(true);
            return;
        }

        setReady(false);
        let cancelled = false;
        let raf2 = 0;
        const markReady = () => {
            if (!cancelled) setReady(true);
        };

        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(markReady);
        });
        const timeoutId = window.setTimeout(markReady, 48);

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            window.clearTimeout(timeoutId);
        };
    }, [enabled]);

    return ready;
}
