import { describe, expect, it } from 'vitest';
import { buildCalendarDossierFingerprint } from '@/app/services/calendar/calendarDossierFingerprint';
import {
    markDossierSyncFingerprint,
    resetDossierSyncStateForTests,
    shouldSkipDossierSyncForFingerprint,
} from '@/app/services/calendar/calendarDossierSyncState';

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
});

describe('calendarDossierSyncState', () => {
    it('يتخطى المزامنة عند تطابق البصمة', () => {
        resetDossierSyncStateForTests();
        markDossierSyncFingerprint('lawyer-1', 'fp-a');
        expect(shouldSkipDossierSyncForFingerprint('lawyer-1', 'fp-a')).toBe(true);
        expect(shouldSkipDossierSyncForFingerprint('lawyer-1', 'fp-b')).toBe(false);
    });
});
