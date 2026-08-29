import { useEffect, useState } from 'react';

/** ساعة حية للستارة — تُحدَّث عند تغيّر اليوم التقويمي وأثناء العودة للتبويب */
export function useLiveNow(enabled: boolean): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        if (!enabled) return;
        const tick = () => {
            const next = new Date();
            setNow((prev) => (prev.toDateString() === next.toDateString() ? prev : next));
        };
        tick();
        const id = window.setInterval(tick, 60_000);
        const onVis = () => {
            if (document.visibilityState === 'visible') tick();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [enabled]);

    return now;
}
