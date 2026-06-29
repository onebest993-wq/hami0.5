import { CALENDAR_REQUEST_SYNC_EVENT } from '@/app/services/calendarBridge.types';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

/** يطلق مزامنة الإضابير → التقويم بعد idle — لا يحجب أول رسم */
export function requestCalendarDossierSyncIdle(timeoutMs = 1_200): () => void {
    if (typeof window === 'undefined') return () => {};
    return scheduleIdleWork(() => {
        try {
            window.dispatchEvent(new CustomEvent(CALENDAR_REQUEST_SYNC_EVENT));
        } catch {
            /* ignore */
        }
    }, timeoutMs);
}
