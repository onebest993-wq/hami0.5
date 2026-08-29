import { useEffect } from 'react';
import {
    HAMI_APP_STATE_EVENT,
    type HamiAppStateDetail,
} from '@/app/runtime/appStateEvents';

function blurActiveElement(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
        active.blur();
    }
}

/**
 * عند إرسال التطبيق للخلفية: إخفاء لوحة المفاتيح وتجنّب focus عالق (iOS/Capacitor).
 * لا يُغلق اللوحة — الحالة محفوظة في الجلسة.
 */
export function useNotificationMobileSuspend(isOpen: boolean): void {
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return;

        const onVisibility = () => {
            if (!document.hidden) return;
            blurActiveElement();
        };

        const onPageHide = () => {
            blurActiveElement();
        };

        const onAppState = (event: Event) => {
            const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
            if (detail?.isActive === false) blurActiveElement();
        };

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener(HAMI_APP_STATE_EVENT, onAppState);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener(HAMI_APP_STATE_EVENT, onAppState);
        };
    }, [isOpen]);
}
