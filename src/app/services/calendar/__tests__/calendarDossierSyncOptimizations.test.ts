import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import {
    markDossierSyncFingerprint,
    resetDossierSyncStateForTests,
    shouldSkipDossierSyncForFingerprint,
} from '@/app/services/calendar/calendarDossierSyncState';
import { ensureCalendarPopulatedFromLiveDossiers } from '@/app/services/calendarDossierSync';
import { TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';

describe('calendarDossierFingerprint', () => {
    it('يتجاهل الملاحظات والمهام الميدانية في البصمة', () => {
        const base = buildCalendarDossierFingerprint([], [], [], [], []);
        const withNotes = buildCalendarDossierFingerprint(
            [],
            [],
            [{ id: 'n1', apptDate: '2026-06-01' }],
            [{ id: 't1', status: 'pending' } as never],
            [],
        );
        expect(withNotes).toBe(base);
    });

    it('يتتبع تواريخ الجزائي وليس العدد فقط', () => {
        const one = buildCalendarDossierFingerprint([], [], [], [], [
            { id: 'c1', nextSessionDate: '2026-06-01' },
        ]);
        const two = buildCalendarDossierFingerprint([], [], [], [], [
            { id: 'c1', nextSessionDate: '2026-06-02' },
        ]);
        expect(one).not.toBe(two);
    });

    it('يتتبع موعد المشاهدة القادم في إضبارة التنفيذ', () => {
        const baseFile = {
            id: 'ex-1',
            status: 'active',
            visitationSchedule: {
                config: { startTime: '16:00', location: 'بيت الطفل' },
                sessions: [{ id: 's1', date: '2099-06-15', status: 'scheduled' }],
            },
        };
        const one = buildCalendarDossierFingerprint([], [baseFile], [], [], []);
        const shifted = buildCalendarDossierFingerprint(
            [],
            [
                {
                    ...baseFile,
                    visitationSchedule: {
                        ...baseFile.visitationSchedule,
                        sessions: [{ id: 's1', date: '2099-06-16', status: 'scheduled' }],
                    },
                },
            ],
            [],
            [],
            [],
        );
        const relocated = buildCalendarDossierFingerprint(
            [],
            [
                {
                    ...baseFile,
                    visitationSchedule: {
                        ...baseFile.visitationSchedule,
                        config: { startTime: '16:00', location: 'المحكمة' },
                    },
                },
            ],
            [],
            [],
            [],
        );
        expect(one).not.toBe(shifted);
        expect(one).not.toBe(relocated);
    });
});

describe('calendarDossierSyncState', () => {
    it('يتخطى المزامنة عند تطابق البصمة', () => {
        resetDossierSyncStateForTests();
        markDossierSyncFingerprint('lawyer-1', 'fp-a');
        expect(shouldSkipDossierSyncForFingerprint('lawyer-1', 'fp-a')).toBe(true);
        expect(shouldSkipDossierSyncForFingerprint('lawyer-1', 'fp-b')).toBe(false);
    });
});

describe('ensureCalendarPopulatedFromLiveDossiers', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('يرجع false عند فشل Threading ولا يرمي', async () => {
        vi.spyOn(TransactionsThreadingDB, 'getState').mockRejectedValue(new Error('kv down'));
        const ok = await ensureCalendarPopulatedFromLiveDossiers(
            {
                lawyerId: 'lawyer-fp',
                lawsuitFiles: [],
                executionFiles: [],
            },
            { emitUpdated: false },
        );
        expect(ok).toBe(false);
    });
});
