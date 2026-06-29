import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CALENDAR_REQUEST_SYNC_EVENT } from '@/app/services/calendarBridge.types';
import { requestCalendarDossierSyncIdle } from '@/app/services/calendar/requestCalendarDossierSyncIdle';

vi.mock('@/app/utils/scheduleIdleWork', () => ({
    scheduleIdleWork: (work: () => void) => {
        work();
        return () => undefined;
    },
}));

describe('requestCalendarDossierSyncIdle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يطلق CALENDAR_REQUEST_SYNC_EVENT بعد idle', () => {
        const handler = vi.fn();
        window.addEventListener(CALENDAR_REQUEST_SYNC_EVENT, handler);

        requestCalendarDossierSyncIdle();

        expect(handler).toHaveBeenCalledTimes(1);
        window.removeEventListener(CALENDAR_REQUEST_SYNC_EVENT, handler);
    });
});
