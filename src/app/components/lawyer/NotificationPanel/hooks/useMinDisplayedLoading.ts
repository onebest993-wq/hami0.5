import { useEffect, useRef, useState } from 'react';

/** يمنع ومضة spinner→فارغ — أقل مدة عرض قبل الإخفاء */
export function useMinDisplayedLoading(active: boolean, minMs = 360): boolean {
    const [displayed, setDisplayed] = useState(active);
    const shownAtRef = useRef(0);

    useEffect(() => {
        if (active) {
            shownAtRef.current = Date.now();
            setDisplayed(true);
            return undefined;
        }
        if (!displayed) return undefined;
        const elapsed = Date.now() - shownAtRef.current;
        const waitMs = Math.max(0, minMs - elapsed);
        if (waitMs <= 0) {
            setDisplayed(false);
            return undefined;
        }
        const timer = window.setTimeout(() => setDisplayed(false), waitMs);
        return () => window.clearTimeout(timer);
    }, [active, displayed, minMs]);

    return displayed;
}
