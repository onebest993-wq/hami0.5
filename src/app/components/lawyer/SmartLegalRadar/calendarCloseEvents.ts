export const CALENDAR_TEARDOWN_EVENT = 'hami:calendar:teardown';
export const CALENDAR_UNREAD_CHANGED_EVENT = 'hami:calendar:unread-changed';
export const CALENDAR_REMINDER_FIRED_EVENT = 'hami:calendar:reminder-fired';
export const CALENDAR_DOSSIER_SYNC_FLUSH_EVENT = 'hami:calendar:dossier-sync-flush';

export {
    blockCalendarEscapeLayer,
    unblockCalendarEscapeLayer,
    resolveCalendarEscapeAction,
    peekCalendarEscapeTopLayer,
    unblockAllCalendarOverlayEscape,
    describeCalendarEscapeStackForDebug,
} from '@/app/components/lawyer/SmartLegalRadar/calendarEscapeStack';

export function peekCalendarEscapeTopLayerSafe(): number {
    try {
        const { peekCalendarEscapeTopLayer } =
            require('@/app/components/lawyer/SmartLegalRadar/calendarEscapeStack') as typeof import('./calendarEscapeStack');
        return peekCalendarEscapeTopLayer();
    } catch {
        return 0;
    }
}
