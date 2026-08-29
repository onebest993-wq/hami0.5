import { useEffect, useState } from 'react';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';

/** أحداث التقويم للمسح العنقودي — من الكاش المحلي دون حجب الواجهة */
export function useCalendarEventsForClusterScan(
    userId: string | undefined,
    enabled: boolean,
): UnifiedEvent[] {
    const [calendarEvents, setCalendarEvents] = useState<UnifiedEvent[]>([]);

    useEffect(() => {
        if (!enabled) {
            setCalendarEvents([]);
            return;
        }
        const uid = String(userId ?? '').trim();
        if (!uid) {
            setCalendarEvents([]);
            return;
        }

        let cancelled = false;
        const sync = () => {
            void import('@/app/components/lawyer/hooks/useCalendarData')
                .then((m) => {
                    if (!cancelled) setCalendarEvents(m.resolveUnifiedCalendarEventsForScan(uid));
                })
                .catch(() => undefined);
        };

        sync();

        const onCalendarUpdated = () => sync();
        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        return () => {
            cancelled = true;
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        };
    }, [enabled, userId]);

    return calendarEvents;
}
