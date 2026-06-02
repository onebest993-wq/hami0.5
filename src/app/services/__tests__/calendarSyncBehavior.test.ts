import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    pruneOrphanedBridgeEvents,
    syncLawsuitFileToCalendar,
} from '../calendarDossierSync';
import { CalendarDB, type CalendarEvent } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId } from '../calendarBridge';

describe('calendar sync behavior', () => {
    beforeEach(() => {
        saveLawsuitFilesRaw([]);
        vi.spyOn(CalendarDB, 'saveEvent').mockResolvedValue(undefined as never);
        vi.spyOn(CalendarDB, 'getEvents').mockResolvedValue([]);
        vi.spyOn(CalendarDB, 'getAllStoredEvents').mockResolvedValue([]);
        vi.spyOn(CalendarDB, 'deleteEvent').mockResolvedValue(undefined as never);
    });

    it('syncLawsuitFileToCalendar upserts real appointments from one file', async () => {
        const file = {
            id: 42,
            caseNo: '2026/9',
            court: 'بغداد',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        {
                            id: 'appt_1',
                            type: 'appointment',
                            date: '2026-06-01',
                            title: 'جلسة',
                        },
                    ],
                },
            ],
        };
        saveLawsuitFilesRaw([file]);

        syncLawsuitFileToCalendar(file, 'lawyer-test');
        await new Promise((r) => setTimeout(r, 50));

        expect(CalendarDB.saveEvent).toHaveBeenCalled();
        const saved = vi.mocked(CalendarDB.saveEvent).mock.calls[0]?.[0];
        expect(saved?.sourceModule).toBe('lawsuit');
        expect(saved?.id).toBe(buildStableBridgeId('lawsuit', '42', 'appt_1'));
    });

    it('syncLawsuitFileToCalendar removes bridged events for archived file', async () => {
        const orphanId = buildStableBridgeId('lawsuit', '99', 'ghost');
        vi.mocked(CalendarDB.getEvents).mockResolvedValue([
            {
                id: orphanId,
                userId: 'lawyer-test',
                title: 'قديم',
                date: '2026-01-01',
                type: 'hearing',
                sourceModule: 'lawsuit',
                sourceEntityId: '99',
                sourceEventId: 'ghost',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ]);

        syncLawsuitFileToCalendar({ id: 99, status: 'archived', stages: [] }, 'lawyer-test');
        await new Promise((r) => setTimeout(r, 50));

        expect(CalendarDB.deleteEvent).toHaveBeenCalledWith(orphanId, 'lawyer-test');
    });

    it('pruneOrphanedBridgeEvents drops lawsuit events without live source', async () => {
        saveLawsuitFilesRaw([
            {
                id: 1,
                stages: [
                    {
                        id: 's1',
                        timeline: [
                            {
                                id: 'live',
                                type: 'appointment',
                                date: '2026-07-01',
                                title: 'موجود',
                            },
                        ],
                    },
                ],
            },
        ]);

        const orphanId = buildStableBridgeId('lawsuit', '1', 'removed');
        const stored: CalendarEvent[] = [
            {
                id: orphanId,
                userId: 'lawyer-test',
                title: 'يتيم',
                date: '2026-07-02',
                type: 'hearing',
                sourceModule: 'lawsuit',
                sourceEntityId: '1',
                sourceEventId: 'removed',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
            {
                id: buildStableBridgeId('lawsuit', '1', 'live'),
                userId: 'lawyer-test',
                title: 'موجود',
                date: '2026-07-01',
                type: 'hearing',
                sourceModule: 'lawsuit',
                sourceEntityId: '1',
                sourceEventId: 'live',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ];
        vi.mocked(CalendarDB.getAllStoredEvents).mockResolvedValue(stored);
        vi.mocked(CalendarDB.getEvents).mockResolvedValue(stored);

        const removed = await pruneOrphanedBridgeEvents('lawyer-test');
        expect(removed).toBe(1);
        expect(CalendarDB.deleteEvent).toHaveBeenCalledWith(orphanId, 'lawyer-test');
    });
});
