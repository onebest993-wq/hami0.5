/**
 * إزالة أحداث التقويم المرتبطة بقضية جزائية — محلي داخل criminal-runtime
 * بلا legacy CalendarBridge (يسحب bridgePersistence/propagate).
 */
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/core';
import { removeCalendarBySource } from '@/app/services/calendar/bridge/syncEngine';
import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import { debug } from '@/app/utils/debug';

function isBridgedCalendarEvent(event: {
    sourceModule?: string | null;
    sourceEntityId?: string | number | null;
    sourceEventId?: string | null;
}): boolean {
    const mod = event.sourceModule;
    return Boolean(mod && mod !== 'manual' && event.sourceEntityId && event.sourceEventId);
}

export async function removeAllCriminalBridgedCalendarEvents(
    sourceEntityId: string | number,
    userId?: string | null,
): Promise<number> {
    const uid = resolveCalendarUserId(userId);
    const entityKey = String(sourceEntityId);
    try {
        const events = await CalendarDB.getEvents(uid);
        let removed = 0;
        for (const e of events) {
            if (!isBridgedCalendarEvent(e)) continue;
            if (e.sourceModule !== 'criminal') continue;
            if (String(e.sourceEntityId) !== entityKey) continue;
            await removeCalendarBySource('criminal', entityKey, String(e.sourceEventId), uid);
            removed++;
        }
        if (removed > 0 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(CALENDAR_UPDATED_EVENT));
        }
        return removed;
    } catch (err) {
        debug.warn('[criminal] removeAllCriminalBridgedCalendarEvents failed:', err);
        return 0;
    }
}
