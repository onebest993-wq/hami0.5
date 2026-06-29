import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import {
    reconcileAllDossierDates,
    removeAllBridgedEventsForEntity,
    syncLawsuitFileToCalendar,
} from '../calendarDossierSync';
import { CalendarDB, type CalendarEvent } from '@/app/services/lawyer-cloud';
import { buildStableBridgeId } from '../calendarBridge';

describe('calendar integration flows', () => {
    beforeEach(() => {
        saveLawsuitFilesRaw([]);
        saveExecutionFilesRaw([]);
        vi.spyOn(CalendarDB, 'saveEvent').mockResolvedValue(undefined as never);
        vi.spyOn(CalendarDB, 'saveEventsBatch').mockResolvedValue(undefined as never);
        vi.spyOn(CalendarDB, 'getEvents').mockResolvedValue([]);
        vi.spyOn(CalendarDB, 'getAllStoredEvents').mockResolvedValue([]);
        vi.spyOn(CalendarDB, 'deleteEvent').mockResolvedValue(undefined as never);
    });

    it('trash then restore re-syncs lawsuit appointments', async () => {
        const file = {
            id: 'case-1',
            status: 'active',
            caseNo: '2026/100',
            court: 'بغداد',
            stages: [
                {
                    id: 's1',
                    timeline: [
                        {
                            id: 'hearing-1',
                            type: 'appointment',
                            date: '2026-08-15',
                            title: 'جلسة',
                        },
                    ],
                },
            ],
        };
        saveLawsuitFilesRaw([file]);

        syncLawsuitFileToCalendar(file, 'lawyer-1');
        await new Promise((r) => setTimeout(r, 30));
        expect(CalendarDB.saveEventsBatch).toHaveBeenCalled();

        await removeAllBridgedEventsForEntity('lawsuit', 'case-1', 'lawyer-1');
        vi.mocked(CalendarDB.saveEventsBatch).mockClear();

        const restored = { ...file, status: 'active' as const, deletedAt: undefined };
        saveLawsuitFilesRaw([restored]);
        syncLawsuitFileToCalendar(restored, 'lawyer-1');
        await new Promise((r) => setTimeout(r, 30));

        expect(CalendarDB.saveEventsBatch).toHaveBeenCalled();
        const id = buildStableBridgeId('lawsuit', 'case-1', 'hearing-1');
        const saved = vi
            .mocked(CalendarDB.saveEventsBatch)
            .mock.calls.find((c) => c[0]?.some((e) => e.id === id));
        expect(saved).toBeTruthy();
    });

    it('reconcile removes orphan when timeline appointment deleted from storage', async () => {
        const file = {
            id: 5,
            stages: [
                {
                    id: 's1',
                    timeline: [
                        {
                            id: 'only-one',
                            type: 'appointment',
                            date: '2026-09-01',
                            title: 'موجود',
                        },
                    ],
                },
            ],
        };
        saveLawsuitFilesRaw([file]);

        const orphanId = buildStableBridgeId('lawsuit', '5', 'ghost');
        const stored: CalendarEvent[] = [
            {
                id: orphanId,
                userId: 'lawyer-1',
                title: 'يتيم',
                date: '2026-09-02',
                type: 'hearing',
                sourceModule: 'lawsuit',
                sourceEntityId: '5',
                sourceEventId: 'ghost',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ];
        vi.mocked(CalendarDB.getAllStoredEvents).mockResolvedValue(stored);
        vi.mocked(CalendarDB.getEvents).mockResolvedValue(stored);

        const stats = await reconcileAllDossierDates('lawyer-1');
        expect(stats.prunedOrphans).toBeGreaterThanOrEqual(1);
        expect(CalendarDB.deleteEvent).toHaveBeenCalledWith(orphanId, 'lawyer-1');
    });
});
