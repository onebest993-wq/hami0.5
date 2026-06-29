import { useEffect, useState } from 'react';

/** يوقف الحركات الثقيلة عند إخفاء التبويب — توفير GPU/بطارية */
export function useProfilePageHidden(screenActive = true): boolean {
    const [hidden, setHidden] = useState(() => {
        if (typeof document === 'undefined') return false;
        return document.hidden;
    });

    useEffect(() => {
        const onVisibility = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    return hidden || !screenActive;
}
