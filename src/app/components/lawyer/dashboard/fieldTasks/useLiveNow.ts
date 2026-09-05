import { useCallback, useState } from 'react';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';

/** ساعة حية للستارة والأجندة — يوم تقويمي + عودة التبويب + عودة Capacitor */
export function useLiveNow(enabled: boolean): Date {
    const [now, setNow] = useState(() => new Date());

    const tick = useCallback(() => {
        const next = new Date();
        setNow((prev) => (prev.toDateString() === next.toDateString() ? prev : next));
    }, []);

    useVisibilityAwareInterval(tick, 60_000, enabled);

    return now;
}
