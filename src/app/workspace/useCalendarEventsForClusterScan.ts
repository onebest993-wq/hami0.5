import { useEffect, useState } from 'react';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { resolveUnifiedCalendarEventsForScan } from '@/app/components/lawyer/hooks/useCalendarData';
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

        const sync = () => {
            setCalendarEvents(resolveUnifiedCalendarEventsForScan(uid));
        };

        sync();

        const onCalendarUpdated = () => sync();
        window.addEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        return () => {
            window.removeEventListener(CALENDAR_UPDATED_EVENT, onCalendarUpdated);
        };
    }, [enabled, userId]);

    return calendarEvents;
}
