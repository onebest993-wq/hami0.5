import { useEffect, useState } from 'react';

const LEDGER_EVENTS = [
    'hami-unified-ledger-updated',
    'hami-unified-ledger-external-collect',
    'hami-unified-ledger-payment-undo',
] as const;

/** مستمع واحد لتحديث بطاقات التنفيذ — بدلاً من N مستمع focus لكل بطاقة */
export function useExecutionArchiveCardLiveRevision(enabled: boolean): number {
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        if (!enabled) return;
        const bump = () => setRevision((n) => n + 1);
        for (const eventName of LEDGER_EVENTS) {
            window.addEventListener(eventName, bump);
        }
        return () => {
            for (const eventName of LEDGER_EVENTS) {
                window.removeEventListener(eventName, bump);
            }
        };
    }, [enabled]);

    return revision;
}
