import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { CalendarDB } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId } from '../calendarBridge';
import { pruneOrphanedBridgeEvents, syncLawsuitTimelineAppointment } from '../calendarDossierSync';
import { flushPendingCalendarSyncs } from '../calendarBridge';

const USER = 'prune-live-user';

describe('prune with live snapshot', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        saveLawsuitFilesRaw([]);
    });

    it('لا يحذف موعد إضبارة محفوظة في الذاكرة قبل الكتابة للتخزين', async () => {
        const liveFile = {
            id: 'live-only-file',
            status: 'active',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        {
                            id: 'appt-live',
                            type: 'appointment',
                            date: '2028-08-01',
                            title: 'جلسة ذاكرة',
                        },
                    ],
                },
            ],
        };

        syncLawsuitTimelineAppointment({
            userId: USER,
            fileId: 'live-only-file',
            event: { id: 'appt-live', date: '2028-08-01', title: 'جلسة ذاكرة' },
        });
        await flushPendingCalendarSyncs();

        const bridgeId = buildStableBridgeId('lawsuit', 'live-only-file', 'appt-live');
        let events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === bridgeId)).toBe(true);

        const removed = await pruneOrphanedBridgeEvents(USER, {
            includeTasks: true,
            live: { lawsuitFiles: [liveFile] },
        });
        expect(removed).toBe(0);

        events = await CalendarDB.getEvents(USER);
        expect(events.some((e) => e.id === bridgeId)).toBe(true);
    });
});
