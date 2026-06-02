import { useCallback, useEffect, useState } from 'react';
import { CalendarDB, type CalendarEvent } from '@/app/services/lawyer-cloud';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';

/** أحداث التقويم المربوطة بإضبارة واحدة — للعرض الموحّد مع السجل الزمني */
export function useEntityCalendarEvents(
    userId: string | null | undefined,
    sourceModule: CalendarSourceModule | null,
    entityId: string | null | undefined,
): CalendarEvent[] {
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    const fetchEvents = useCallback(() => {
        const uid = resolveCalendarUserId(userId ?? null);
        const mod = sourceModule;
        const eid = String(entityId ?? '').trim();
        if (!mod || !eid) {
            setEvents([]);
            return;
        }
        void CalendarDB.getEvents(uid)
            .then((list) => {
                const filtered = (Array.isArray(list) ? list : []).filter(
                    (e) =>
                        e.sourceModule === mod &&
                        String(e.sourceEntityId ?? '') === eid &&
                        !e.isCompleted,
                );
                setEvents(filtered);
            })
            .catch(() => setEvents([]));
    }, [userId, sourceModule, entityId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        const onUpdate = () => fetchEvents();
        window.addEventListener(CALENDAR_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(CALENDAR_UPDATED_EVENT, onUpdate);
    }, [fetchEvents]);

    return events;
}
