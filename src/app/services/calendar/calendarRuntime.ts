// Legacy compatibility shim for stale IDE tabs and old imports.
// Keep runtime imports relative to avoid alias-resolution false positives
// in editor-only contexts.
export { CalendarDB } from '../cloud/lawyerCalendarCloud';
export type { CalendarEvent, CalendarEventType } from './calendarTypes';
