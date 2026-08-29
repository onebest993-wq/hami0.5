import { useEffect, useRef } from 'react';
import {
    HAMI_APP_STATE_EVENT,
    type HamiAppStateDetail,
} from '@/app/runtime/appStateEvents';

/**
 * interval يتوقف تلقائياً عند إخفاء التبويب أو إرسال التطبيق للخلفية — يوفّر بطارية وشبكة.
 * عند العودة يُنفَّذ tick فوراً ثم يُستأنف الـ interval.
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

        const applyActive = (active: boolean) => {
            if (!active || document.hidden) {
                stop();
                return;
            }
            if (intervalId !== null) return;
            tickRef.current();
            start();
        };

        const onVisibilityChange = () => {
            applyActive(!document.hidden);
        };

        const onPageHide = () => {
            applyActive(false);
        };

        const onAppState = (event: Event) => {
            const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
            applyActive(detail?.isActive !== false);
        };

        if (!document.hidden) {
            start();
        }

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener(HAMI_APP_STATE_EVENT, onAppState);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener(HAMI_APP_STATE_EVENT, onAppState);
        };
    }, [enabled, intervalMs]);
}
