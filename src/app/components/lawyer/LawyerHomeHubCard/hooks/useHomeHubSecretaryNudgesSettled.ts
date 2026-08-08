import { useEffect, useRef, useState } from 'react';
import type { SparkNudge } from '@/app/spark/types';

const SECRETARY_NUDGES_SETTLE_MS = 48;

/**
 * يُجمّع تحديثات توصيات السكرتير القصيرة — يمنع ظهور 2 ثم 3 على دفعتين.
 */
export function useHomeHubSecretaryNudgesSettled(nudges: SparkNudge[]): SparkNudge[] {
    const [settled, setSettled] = useState(nudges);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (timerRef.current != null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (nudges.length === 0) {
            setSettled([]);
            return undefined;
        }

        if (settled.length === 0 && nudges.length > 0) {
            setSettled(nudges);
        }

        timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            setSettled(nudges);
        }, SECRETARY_NUDGES_SETTLE_MS);

        return () => {
            if (timerRef.current != null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [nudges, settled.length]);

    return settled;
}
