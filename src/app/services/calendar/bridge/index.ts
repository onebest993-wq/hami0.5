export {
    CALENDAR_UPDATED_EVENT,
    CALENDAR_SOURCE_PATCHED_EVENT,
    CALENDAR_BACKGROUND_SYNC_FAILED_EVENT,
} from '@/app/services/calendarBridge.types';
export type { CalendarBridgePayload, CalendarSourceModule } from '@/app/services/calendarBridge.types';
export * from './core';
export * from './syncEngine';
export { CalendarBridge } from './legacyCalendarBridge';
export {
    propagateBridgedCalendarRemoval,
    propagateBridgedCalendarUpdate,
    isBridgedCalendarEvent,
} from '@/app/services/calendar/bridgePersistence';
export type { CalendarSourcePatchDetail } from '@/app/services/calendar/bridgePersistence';
