import { useEffect, useState } from 'react';

/**
 * أقصى انتظار إن لم يصل pointerup (فتح برمجي / لوحة مفاتيح).
 * نقرة الشبح تُرفع عند نهاية اللمسة نفسها — لا نحبس القائمة 420ms.
 */
export const OPEN_GUARD_FALLBACK_MS = 180;

/**
 * يمنع سقوط لمسة بلاطة hub على أول بطاقة بعد flushSync.
 * يُفكّ عند pointerup/pointercancel أو بعد نافذة احتياط قصيرة.
 */
export function useTransactionsOpenInteractionGuard(hubOpen: boolean): boolean {
    const [interactive, setInteractive] = useState(false);

    useEffect(() => {
        if (!hubOpen) {
            setInteractive(false);
            return;
        }
        setInteractive(false);
        let released = false;
        const release = () => {
            if (released) return;
            released = true;
            setInteractive(true);
        };

        window.addEventListener('pointerup', release, { capture: true, once: true });
        window.addEventListener('pointercancel', release, { capture: true, once: true });
        const fallback = window.setTimeout(release, OPEN_GUARD_FALLBACK_MS);
        return () => {
            released = true;
            window.removeEventListener('pointerup', release, true);
            window.removeEventListener('pointercancel', release, true);
            window.clearTimeout(fallback);
        };
    }, [hubOpen]);

    return interactive;
}
