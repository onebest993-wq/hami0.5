import { useEffect, useState } from 'react';

/** وقت الأجندة — يُحدَّث عند تغيّر اليوم التقويمي فقط (لا كل دقيقة) */
export function useAgendaNow(): Date {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const tick = () => {
            const next = new Date();
            setNow((prev) => (prev.toDateString() === next.toDateString() ? prev : next));
        };
        const id = window.setInterval(tick, 60_000);
        return () => window.clearInterval(id);
    }, []);

    return now;
}
