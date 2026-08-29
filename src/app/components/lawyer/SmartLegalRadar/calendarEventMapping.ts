import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
import {
    isBridgedCalendarEvent,
    isUserAuthoredBridgedCalendarEvent,
} from '@/app/services/calendar/calendarEventAuthorship';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { unifiedCalendarEventId } from '@/app/components/lawyer/SmartLegalRadar/calendarFocusIds';
import { resolveRadarEventDisplayMeta } from '@/app/components/lawyer/SmartLegalRadar/radarEventDisplayMeta';
import {
    durationMinutesFromTimeRange,
    resolveCalendarLikeEventDurationMinutes,
} from '@/app/services/calendar/calendarDurationUtils';

function buildUnifiedEventFromCalendarRecord(e: CalendarEvent): UnifiedEvent {
    const bridged = isBridgedCalendarEvent(e);
    const meta = resolveRadarEventDisplayMeta({
        notes: e.notes,
        court: e.court,
        partiesSummary: e.partiesSummary,
        sourceLabel: e.sourceLabel,
        location: e.location,
    });
    const location = meta.location ?? (e.location?.trim() || undefined);
    const endTime = e.endTime?.trim() || undefined;
    const durationMinutes =
        durationMinutesFromTimeRange(e.time, endTime) ??
        resolveCalendarLikeEventDurationMinutes({
            time: e.time,
            endTime,
            type: e.type,
            source: 'calendar',
        });

    return {
        id: unifiedCalendarEventId(e.id),
        title: e.title,
        date: e.date,
        time: e.time,
        endTime,
        durationMinutes,
        type: e.type,
        location,
        notes: e.notes,
        clientName: e.clientName,
        clientPhone: e.clientPhone,
        revenue: e.revenue,
        caseNo: e.caseNo,
        isCompleted: e.isCompleted,
        source: 'calendar',
        isBridged: bridged,
        court: meta.court,
        partiesSummary: meta.partiesSummary,
        sourceLabel: meta.sourceLabel,
        reminderMinutesBefore: e.reminderMinutesBefore ?? null,
        bridge:
            bridged && e.sourceModule && e.sourceEntityId && e.sourceEventId
                ? {
                      sourceModule: e.sourceModule,
                      sourceEntityId: e.sourceEntityId,
                      sourceEventId: e.sourceEventId,
                      calendarRecordId: e.id,
                  }
                : undefined,
    };
}

function resolveSparkScanSource(e: CalendarEvent, bridged: boolean): UnifiedEvent['source'] {
    if (bridged) return 'hearing';
    if (e.type === 'deadline') return 'deadline';
    return 'calendar';
}

export function mapStoredEventsToUnified(customEvents: CalendarEvent[]): UnifiedEvent[] {
    const result: UnifiedEvent[] = [];
    for (const e of customEvents) {
        if (!isUserAuthoredBridgedCalendarEvent(e)) continue;
        result.push(buildUnifiedEventFromCalendarRecord(e));
    }
    return result;
}

/** كل الأحداث غير المكتملة — لمسح سبارك/التضارب (يشمل الجسر الآلي) */
export function mapAllCalendarEventsForSparkScan(customEvents: CalendarEvent[]): UnifiedEvent[] {
    const result: UnifiedEvent[] = [];
    for (const e of customEvents) {
        if (e.isCompleted) continue;
        const bridged = isBridgedCalendarEvent(e);
        const unified = buildUnifiedEventFromCalendarRecord(e);
        result.push({
            ...unified,
            isCompleted: false,
            source: resolveSparkScanSource(e, bridged),
        });
    }
    return result;
}
