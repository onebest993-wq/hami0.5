import { isBridgedCalendarEvent } from '@/app/services/calendarBridge';
import { isUserAuthoredBridgedCalendarEvent } from '@/app/services/calendarAuthenticity';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

export function mapStoredEventsToUnified(customEvents: CalendarEvent[]): UnifiedEvent[] {
    const result: UnifiedEvent[] = [];
    for (const e of customEvents) {
        if (!isUserAuthoredBridgedCalendarEvent(e)) continue;
        const bridged = isBridgedCalendarEvent(e);
        result.push({
            id: `cal_${e.id}`,
            title: e.title,
            date: e.date,
            time: e.time,
            type: e.type,
            location: e.location,
            notes: e.notes,
            clientName: e.clientName,
            clientPhone: e.clientPhone,
            revenue: e.revenue,
            caseNo: e.caseNo,
            isCompleted: e.isCompleted,
            source: 'calendar',
            isBridged: bridged,
            bridge:
                bridged && e.sourceModule && e.sourceEntityId && e.sourceEventId
                    ? {
                          sourceModule: e.sourceModule,
                          sourceEntityId: e.sourceEntityId,
                          sourceEventId: e.sourceEventId,
                          calendarRecordId: e.id,
                      }
                    : undefined,
        });
    }
    return result;
}
