import { useState, useEffect } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

export function useTodayYmd(): string {
    const [todayYmd, setTodayYmd] = useState<string>(() => getLocalTodayYmd());

    useEffect(() => {
        let timeoutId: number | undefined;
        const scheduleNextTick = () => {
            const now = new Date();
            const next = new Date(now);
            next.setHours(24, 0, 1, 0);
            const ms = Math.max(1000, next.getTime() - now.getTime());
            timeoutId = window.setTimeout(() => {
                setTodayYmd(getLocalTodayYmd());
                scheduleNextTick();
            }, ms);
        };
        scheduleNextTick();
        const onVisibility = () => {
            if (document.visibilityState === 'visible') setTodayYmd(getLocalTodayYmd());
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    return todayYmd;
}
