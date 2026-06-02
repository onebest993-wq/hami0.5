import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import type { TimelineEvent } from '@/app/types/execution';
import { normalizeDateToYmd } from '@/app/services/calendarBridge';

/**
 * يوحّد تواريخ مواعيد السجل الزمني مع CalendarDB (المصدر المعروض للتقويم).
 * أحداث غير المواعيد تبقى كما هي.
 */
export function mergeTimelineEventsWithCalendar(
    timelineEvents: TimelineEvent[],
    calendarEvents: CalendarEvent[],
    sourceModule: 'execution' | 'lawsuit',
    entityId: string,
): TimelineEvent[] {
    const entityKey = String(entityId);
    const bySourceEventId = new Map<string, CalendarEvent>();

    for (const ce of calendarEvents) {
        if (ce.sourceModule !== sourceModule) continue;
        if (String(ce.sourceEntityId ?? '') !== entityKey) continue;
        const sid = String(ce.sourceEventId ?? '').trim();
        if (!sid || ce.isCompleted) continue;
        bySourceEventId.set(sid, ce);
    }

    return timelineEvents.map((ev) => {
        if (String(ev.type ?? '') !== 'appointment') return ev;
        const eventId = String(ev.id ?? '').trim();
        const cal = bySourceEventId.get(eventId);
        if (!cal) return ev;

        const ymd = normalizeDateToYmd(cal.date) ?? cal.date;
        const merged: TimelineEvent = {
            ...ev,
            date: ymd,
            timestamp: cal.time ? `${ymd}T${cal.time}:00` : ymd,
            title: cal.title || ev.title,
            description: cal.notes ?? ev.description,
        };
        return merged;
    });
}
