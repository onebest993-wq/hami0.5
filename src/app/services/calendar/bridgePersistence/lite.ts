import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { CALENDAR_SOURCE_PATCHED_EVENT } from '@/app/services/calendarBridge.types';

export { CALENDAR_SOURCE_PATCHED_EVENT };

export type CalendarSourcePatchDetail = {
    sourceModule: CalendarSourceModule;
    sourceEntityId: string;
    sourceEventId: string;
};

/** خفيف — بلا executionFilesStorage / lawsuitFilesStorage */
export function isBridgedCalendarEvent(event: CalendarEvent): boolean {
    const mod = event.sourceModule;
    return Boolean(mod && mod !== 'manual' && event.sourceEntityId && event.sourceEventId);
}

export function notifySourcePatched(detail: CalendarSourcePatchDetail): void {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(CALENDAR_SOURCE_PATCHED_EVENT, { detail }));
        }
    } catch {
        /* ignore */
    }
}
