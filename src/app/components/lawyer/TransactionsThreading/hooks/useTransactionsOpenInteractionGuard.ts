import { useEffect, useRef, useState } from 'react';

/**
 * أقصى انتظار إن لم يصل pointerup (فتح برمجي / لوحة مفاتيح).
 * نقرة الشبح تُرفع عند نهاية اللمسة نفسها — لا نحبس القائمة 420ms.
 */
export const OPEN_GUARD_FALLBACK_MS = 180;

let transactionsOpenGuardSessionCounter = 0;
let lastActiveTransactionsGuardFlowId: number | null = null;

/**
 * يمنع سقوط لمسة بلاطة hub على أول بطاقة بعد flushSync.
 * يُفكّ عند pointerup/pointercancel أو بعد نافذة احتياط قصيرة.
 */
export function useTransactionsOpenInteractionGuard(hubOpen: boolean): boolean {
    const [interactive, setInteractive] = useState(false);
    const sessionIdRef = useRef<number>(++transactionsOpenGuardSessionCounter);
    const activeSessionIdRef = useRef<number>(sessionIdRef.current);
    lastActiveTransactionsGuardFlowId = sessionIdRef.current;
    const isActiveFlow = () =>
        sessionIdRef.current === activeSessionIdRef.current &&
        lastActiveTransactionsGuardFlowId === sessionIdRef.current;

    useEffect(() => {
        if (!hubOpen) {
            setInteractive(false);
            return;
        }
        setInteractive(false);
        let released = false;
        const release = () => {
            if (released) return;
            if (!isActiveFlow()) return;
            released = true;
            setInteractive(true);
        };

        window.addEventListener('pointerup', release, { capture: true, once: true });
        window.addEventListener('pointercancel', release, { capture: true, once: true });
        const fallback = window.setTimeout(() => {
            if (!isActiveFlow()) return;
            release();
        }, OPEN_GUARD_FALLBACK_MS);
        return () => {
            released = true;
            window.removeEventListener('pointerup', release, true);
            window.removeEventListener('pointercancel', release, true);
            window.clearTimeout(fallback);
            if (activeSessionIdRef.current === sessionIdRef.current) {
                activeSessionIdRef.current = 0;
            }
        };
    }, [hubOpen]);

    return interactive;
}
