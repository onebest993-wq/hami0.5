import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CALENDAR_REQUEST_SYNC_EVENT } from '@/app/services/calendarBridge.types';
import { requestCalendarDossierSyncNow } from '@/app/services/calendar/requestCalendarDossierSyncNow';
import { requestCalendarDossierSyncIdle } from '@/app/services/calendar/requestCalendarDossierSyncIdle';

describe('requestCalendarDossierSyncNow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يطلق CALENDAR_REQUEST_SYNC_EVENT فوراً مع immediate', () => {
        const handler = vi.fn();
        window.addEventListener(CALENDAR_REQUEST_SYNC_EVENT, handler);

        requestCalendarDossierSyncNow();

        expect(handler).toHaveBeenCalledTimes(1);
        expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ immediate: true });
        window.removeEventListener(CALENDAR_REQUEST_SYNC_EVENT, handler);
    });

    it('requestCalendarDossierSyncIdle يوجّه إلى المسار الفوري', () => {
        const handler = vi.fn();
        window.addEventListener(CALENDAR_REQUEST_SYNC_EVENT, handler);

        requestCalendarDossierSyncIdle();

        expect(handler).toHaveBeenCalledTimes(1);
        window.removeEventListener(CALENDAR_REQUEST_SYNC_EVENT, handler);
    });
});
