import { useEffect, useState } from 'react';
import {
    HAMI_APP_STATE_EVENT,
    type HamiAppStateDetail,
} from '@/app/runtime/appStateEvents';

/**
 * يخفي الرسم الثقيل عند إخفاء تبويب المتصفح أو وضع التطبيق في الخلفية.
 * لا يُربط بـ screenActive — كان يقلب أنماط aurora/portrait بعد snap بفارق إطارات → قفزة بصرية.
 */
export function useProfilePageHidden(_screenActive = true): boolean {
    const [hidden, setHidden] = useState(() => {
        if (typeof document === 'undefined') return false;
        return document.hidden;
    });

    useEffect(() => {
        const onVisibility = () => setHidden(document.hidden);
        const onAppState = (event: Event) => {
            const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
            if (detail?.isActive === false) setHidden(true);
            else if (detail?.isActive === true) setHidden(document.hidden);
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener(HAMI_APP_STATE_EVENT, onAppState);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener(HAMI_APP_STATE_EVENT, onAppState);
        };
    }, []);

    return hidden;
}
