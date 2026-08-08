import { useEffect, useState } from 'react';

/** يمنع «نقرة الشبح» — نفس لمسة بلاطة hub قد تُسقِط على أول بطاقة بعد flushSync */
const OPEN_GUARD_MS = 420;

/**
 * يُفعَّل بعد فتح hub — البطاقات غير قابلة للنقر حتى انتهاء النافذة.
 */
export function useTransactionsOpenInteractionGuard(hubOpen: boolean): boolean {
    const [interactive, setInteractive] = useState(false);

    useEffect(() => {
        if (!hubOpen) {
            setInteractive(false);
            return;
        }
        setInteractive(false);
        const t = window.setTimeout(() => setInteractive(true), OPEN_GUARD_MS);
        return () => window.clearTimeout(t);
    }, [hubOpen]);

    return interactive;
}
