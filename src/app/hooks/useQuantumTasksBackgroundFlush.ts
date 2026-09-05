import { useEffect, useRef } from 'react';
import { HAMI_APP_STATE_EVENT, type HamiAppStateDetail } from '@/app/runtime/appStateEvents';

const HIDDEN_FLUSH_DELAY_MS = 900;

/**
 * يفرّغ القرص فور pagehide، وبعد تأخير قصير عند إخفاء التبويب،
 * وفوراً عند `hami-native-app-state` غير النشط — Capacitor قد يجمّد JS قبل مؤقّت الـ 900ms.
 */
export function useQuantumTasksBackgroundFlush(flush: () => void): void {
    const flushRef = useRef(flush);
    flushRef.current = flush;

    useEffect(() => {
        let hiddenFlushTimer: number | null = null;

        const flushNow = () => {
            if (hiddenFlushTimer !== null) {
                window.clearTimeout(hiddenFlushTimer);
                hiddenFlushTimer = null;
            }
            flushRef.current();
        };

        const onHide = () => {
            if (document.visibilityState !== 'hidden') {
                if (hiddenFlushTimer !== null) {
                    window.clearTimeout(hiddenFlushTimer);
                    hiddenFlushTimer = null;
                }
                return;
            }
            if (hiddenFlushTimer !== null) {
                window.clearTimeout(hiddenFlushTimer);
            }
            hiddenFlushTimer = window.setTimeout(() => {
                hiddenFlushTimer = null;
                if (document.visibilityState === 'hidden') flushNow();
            }, HIDDEN_FLUSH_DELAY_MS) as unknown as number;
        };

        const onAppState = (event: Event) => {
            const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
            if (detail?.isActive === false) flushNow();
        };

        window.addEventListener('pagehide', flushNow);
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener(HAMI_APP_STATE_EVENT, onAppState);
        return () => {
            window.removeEventListener('pagehide', flushNow);
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener(HAMI_APP_STATE_EVENT, onAppState);
            if (hiddenFlushTimer !== null) window.clearTimeout(hiddenFlushTimer);
        };
    }, []);
}
