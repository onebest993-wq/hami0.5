import { describe, expect, it } from 'vitest';
import { FIRST_HEARING_TIMELINE_APPT_ID } from '@/app/domain/lawsuit/lawsuitFileFactory';
import {
    resolveLawsuitArchiveHearingDisplay,
    shouldShowLawsuitArchiveHearing,
} from '../utils/lawsuitArchiveHearing';

describe('resolveLawsuitArchiveHearingDisplay', () => {
    it('labels first hearing when nextDate matches firstHearingDate', () => {
        const display = resolveLawsuitArchiveHearingDisplay({
            firstHearingDate: '2026-09-15',
            nextDate: '2026-09-15',
            stages: [
                {
                    stageName: 'البداءة',
                    status: 'active',
                    isPleadingsClosed: false,
                },
            ],
            activeStageIndex: 0,
            history: [
                {
                    id: FIRST_HEARING_TIMELINE_APPT_ID,
                    type: 'appointment',
                    date: '2026-09-15',
                    title: 'أول مرافعة',
                },
            ],
        });
        expect(display).toEqual({ ymd: '2026-09-15', label: 'أول مرافعة', sessionNumber: 1 });
    });

    it('switches to next hearing label when nextDate diverges from first hearing', () => {
        const display = resolveLawsuitArchiveHearingDisplay({
            firstHearingDate: '2026-09-01',
            nextDate: '2026-09-20',
            stages: [
                {
                    stageName: 'البداءة',
                    status: 'active',
                    isPleadingsClosed: false,
                },
            ],
            activeStageIndex: 0,
        });
        expect(display).toEqual({ ymd: '2026-09-20', label: 'المرافعة القادمة', sessionNumber: 2 });
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

    it('hides hearing when dossier is finalized', () => {
        expect(
            shouldShowLawsuitArchiveHearing({
                status: 'نشطة',
                firstHearingDate: '2026-07-21',
                nextDate: '2026-08-12',
                stages: [
                    {
                        stageName: 'التمييز',
                        finalDecision: 'مكتسبة الدرجة القطعية',
                        status: 'completed',
                    },
                ],
                activeStageIndex: 0,
            }),
        ).toBe(false);
        expect(
            resolveLawsuitArchiveHearingDisplay({
                status: 'نشطة',
                firstHearingDate: '2026-07-21',
                nextDate: '2026-08-12',
                stages: [
                    {
                        stageName: 'التمييز',
                        finalDecision: 'مكتسبة الدرجة القطعية',
                        status: 'completed',
                    },
                ],
                activeStageIndex: 0,
            }),
        ).toBeNull();
    });

    it('hides hearing on correction stage and when pleadings are closed', () => {
        expect(
            shouldShowLawsuitArchiveHearing({
                firstHearingDate: '2026-08-04',
                nextDate: '2026-08-04',
                stages: [
                    {
                        stageName: 'تصحيح قرار',
                        status: 'active',
                        isPleadingsClosed: false,
                    },
                ],
                activeStageIndex: 0,
            }),
        ).toBe(false);

        expect(
            shouldShowLawsuitArchiveHearing({
                firstHearingDate: '2026-08-04',
                nextDate: '2026-08-04',
                stages: [
                    {
                        stageName: 'البداءة',
                        status: 'active',
                        isPleadingsClosed: true,
                        wasReopened: false,
                    },
                ],
                activeStageIndex: 0,
            }),
        ).toBe(false);
    });

    it('does not surface stale past hearing dates', () => {
        const display = resolveLawsuitArchiveHearingDisplay({
            firstHearingDate: '2020-01-01',
            nextDate: '2020-01-01',
            stages: [
                {
                    stageName: 'البداءة',
                    status: 'active',
                    isPleadingsClosed: false,
                },
            ],
            activeStageIndex: 0,
        });
        expect(display).toBeNull();
    });
});
