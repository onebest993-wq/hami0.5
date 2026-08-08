import { requestCalendarDossierSyncNow } from '@/app/services/calendar/requestCalendarDossierSyncNow';

/** @deprecated استخدم requestCalendarDossierSyncNow — المسار القديم بلا تأخير idle */
export function requestCalendarDossierSyncIdle(_timeoutMs?: number): () => void {
    requestCalendarDossierSyncNow();
    return () => undefined;
}
