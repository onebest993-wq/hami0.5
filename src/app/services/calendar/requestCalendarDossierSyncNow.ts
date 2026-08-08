import { CALENDAR_REQUEST_SYNC_EVENT } from '@/app/services/calendarBridge.types';

/** مزامنة فورية إضابير→تقويم — بلا انتظار idle (يُستدعى أثناء التسخين قبل الفتح) */
export function requestCalendarDossierSyncNow(): void {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(
            new CustomEvent(CALENDAR_REQUEST_SYNC_EVENT, { detail: { immediate: true } }),
        );
    } catch {
        /* ignore */
    }
}
