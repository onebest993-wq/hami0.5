import { describe, expect, it } from 'vitest';
import { FIRST_HEARING_TIMELINE_APPT_ID } from '@/app/domain/lawsuit/lawsuitFileFactory';
import { resolveLawsuitArchiveHearingDisplay } from '../utils/lawsuitArchiveHearing';

describe('resolveLawsuitArchiveHearingDisplay', () => {
    it('labels first hearing when nextDate matches firstHearingDate', () => {
        const display = resolveLawsuitArchiveHearingDisplay({
            firstHearingDate: '2026-07-30',
            nextDate: '2026-07-30',
            history: [
                {
                    id: FIRST_HEARING_TIMELINE_APPT_ID,
                    type: 'appointment',
                    date: '2026-07-30',
                    title: 'أول مرافعة',
                },
            ],
        });
        expect(display).toEqual({ ymd: '2026-07-30', label: 'أول مرافعة', sessionNumber: 1 });
    });

    it('switches to next hearing label when nextDate diverges from first hearing', () => {
        const display = resolveLawsuitArchiveHearingDisplay({
            firstHearingDate: '2026-07-21',
            nextDate: '2026-08-12',
        });
        expect(display).toEqual({ ymd: '2026-08-12', label: 'المرافعة القادمة', sessionNumber: 2 });
    });

    it('reads postponed first hearing from timeline nextDate on appt event', () => {
        const display = resolveLawsuitArchiveHearingDisplay({
            firstHearingDate: '2026-07-21',
            nextDate: '2026-07-21',
            history: [
                {
                    id: FIRST_HEARING_TIMELINE_APPT_ID,
                    type: 'appointment',
                    date: '2026-07-21',
                    nextDate: '2026-09-05',
                },
            ],
        });
        expect(display).toEqual({ ymd: '2026-09-05', label: 'المرافعة القادمة', sessionNumber: 1 });
    });

    it('prefers file nextDate over stale first hearing when postponed at file level', () => {
        const display = resolveLawsuitArchiveHearingDisplay({
            firstHearingDate: '2026-07-21',
            nextDate: '2026-09-01',
            history: [
                {
                    id: FIRST_HEARING_TIMELINE_APPT_ID,
                    type: 'appointment',
                    date: '2026-07-21',
                    nextDate: '2026-09-05',
                },
            ],
        });
        expect(display).toEqual({ ymd: '2026-09-01', label: 'المرافعة القادمة', sessionNumber: 2 });
    });
});
