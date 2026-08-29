import { useCallback, useRef, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

export const DOCUMENT_HOLD_MS = 880;
export const DOCUMENT_HOLD_REDUCED_MS = 120;

/**
 * وقفة قصيرة على المستند الفارغ بعد فتح الباب أو الرمز.
 * المهلة تُجدوَل مرة واحدة عند البدء — لا تُصفَّر إن تغيّر reduceMotion.
 */
export function useDocumentHold(onFinished: () => void): {
    holdActive: boolean;
    beginHold: () => void;
} {
    const reduceMotion = useReduceMotion();
    const [holdActive, setHoldActive] = useState(false);
    const finishedRef = useRef(onFinished);
    finishedRef.current = onFinished;
    const reduceMotionRef = useRef(reduceMotion);
    reduceMotionRef.current = reduceMotion;
    const startedRef = useRef(false);

    const beginHold = useCallback(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        setHoldActive(true);
        const ms = reduceMotionRef.current ? DOCUMENT_HOLD_REDUCED_MS : DOCUMENT_HOLD_MS;
        window.setTimeout(() => {
            setHoldActive(false);
            finishedRef.current();
        }, ms);
    }, []);

    return { holdActive, beginHold };
}
