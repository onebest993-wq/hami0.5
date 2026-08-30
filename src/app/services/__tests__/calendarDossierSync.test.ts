import { describe, expect, it, beforeEach, vi } from 'vitest';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { reconcileAllDossierDates, resetReconcileInFlightForTests } from '../calendarDossierSync';
import { CalendarDB } from '@/app/services/lawyer-cloud';

describe('calendarDossierSync', () => {
    beforeEach(() => {
        saveLawsuitFilesRaw([]);
        resetReconcileInFlightForTests();
        vi.spyOn(CalendarDB, 'saveEvent').mockResolvedValue(undefined as never);
        vi.spyOn(CalendarDB, 'saveEventsBatch').mockResolvedValue(undefined as never);
        vi.spyOn(CalendarDB, 'getEvents').mockResolvedValue([]);
    });

    it('reconcileAllDossierDates picks lawsuit appointments from all stages', async () => {
        saveLawsuitFilesRaw([
            {
                id: 7,
                caseNo: '2026/1',
                court: 'بغداد',
                stages: [
                    {
                        id: 's1',
                        name: 'أولى',
                        status: 'completed',
                        timeline: [
                            {
                                id: 'appt_old',
                                type: 'appointment',
                                date: '2026-04-10',
                                title: 'جلسة قديمة',
                            },
                        ],
                    },
                    {
                        id: 's2',
                        name: 'استئناف',
                        status: 'active',
                        timeline: [
                            {
                                id: 'appt_new',
                                type: 'appointment',
                                date: '2026-05-01',
                                title: 'جلسة جديدة',
                            },
                        ],
                        tasks: [{ id: 't1', title: 'مهمة', dueDate: '2026-05-15', isCompleted: false }],
                    },
                ],
            },
        ]);

        const stats = await reconcileAllDossierDates('lawyer-test');
        // reconcile الشامل: مواعيد + مهام استحقاق (المسار الحيّ whitelistOnly يختلف)
        expect(stats.lawsuitAppointments).toBe(2);
        expect(stats.lawsuitTasks).toBe(1);
        expect(CalendarDB.saveEventsBatch).toHaveBeenCalled();
    });
});
