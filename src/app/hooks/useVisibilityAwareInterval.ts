import { useEffect, useRef } from 'react';

/**
 * interval يتوقف تلقائياً عند إخفاء التبويب — يوفر بطارية وشبكة.
 * عند العودة للتبويب يُنفَّذ tick فوراً ثم يُستأنف الـ interval.
 */
export function useVisibilityAwareInterval(
    tick: () => void,
    intervalMs: number,
    enabled = true,
): void {
    const tickRef = useRef(tick);
    tickRef.current = tick;

    useEffect(() => {
        if (!enabled || typeof window === 'undefined' || intervalMs <= 0) return;

        let intervalId: ReturnType<typeof setInterval> | null = null;

        const stop = () => {
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const start = () => {
            stop();
            intervalId = setInterval(() => tickRef.current(), intervalMs);
        };

        const onVisibilityChange = () => {
            if (document.hidden) {
                stop();
                return;
            }
            tickRef.current();
            start();
        };

        if (!document.hidden) {
            start();
        }

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [enabled, intervalMs]);
}
