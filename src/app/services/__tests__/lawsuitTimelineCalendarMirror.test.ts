import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    LAWSUIT_CAL_APPT,
    collectStageLegalCalendarSpecs,
    mirrorSessionNextHearingToCalendar,
    mirrorStageLegalDatesToCalendar,
} from '../lawsuitTimelineCalendarMirror';

vi.mock('../calendarDossierSync', () => ({
    syncLawsuitTimelineAppointment: vi.fn(),
}));

describe('lawsuitTimelineCalendarMirror', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates pleading appointment for session next hearing', () => {
        const stages = [{ id: 's1', timeline: [] as unknown[] }];
        const next = mirrorSessionNextHearingToCalendar(
            stages as never,
            0,
            'sess-1',
            '2026-07-01',
            'محضر الجلسة 3',
            { fileId: 'case-1', userId: 'u1' },
        );
        const timeline = next[0].timeline ?? [];
        expect(timeline.some((e) => e.id === LAWSUIT_CAL_APPT.sessionNext('sess-1'))).toBe(true);
    });

    it('mirrors appeal deadline and judgment date from stage', () => {
        const stages = [
            {
                id: 'stage-1',
                stageName: 'بداءة',
                decisionDate: '2026-06-01',
                appealDeadline: '2026-06-26',
                timeline: [],
            },
        ];
        const next = mirrorStageLegalDatesToCalendar(stages as never, 0, {
            fileId: 'case-9',
            userId: 'u1',
        });
        const ids = (next[0].timeline ?? []).map((e) => e.id);
        expect(ids).toContain(LAWSUIT_CAL_APPT.appealDeadline('stage-1'));
        expect(ids).toContain(LAWSUIT_CAL_APPT.judgmentDate('stage-1'));
    });

    it('uses smart stage-aware labels for judgment and appeal deadlines', () => {
        const stages = [
            {
                id: 'first',
                stageName: 'بداءة',
                decisionDate: '2026-06-01',
                appealDeadline: '2026-06-26',
                timeline: [],
            },
            {
                id: 'appeal',
                stageName: 'الاستئناف',
                decisionDate: '2026-07-01',
                appealDeadline: '2026-07-31',
                timeline: [],
            },
            {
                id: 'cass',
                stageName: 'التمييز',
                decisionDate: '2026-08-01',
                appealDeadline: '2026-08-30',
                timeline: [],
            },
        ];

        const first = mirrorStageLegalDatesToCalendar(stages as never, 0, {
            fileId: 'case-1',
            userId: 'u1',
        });
        const appeal = mirrorStageLegalDatesToCalendar(stages as never, 1, {
            fileId: 'case-1',
            userId: 'u1',
        });
        const cass = mirrorStageLegalDatesToCalendar(stages as never, 2, {
            fileId: 'case-1',
            userId: 'u1',
        });

        expect(first[0].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.judgmentDate('first'))?.title).toBe(
            'تاريخ الحكم'
        );
        expect(appeal[1].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.judgmentDate('appeal'))?.title).toBe(
            'تاريخ الحكم الاستئنافي'
        );
        expect(cass[2].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.judgmentDate('cass'))?.title).toBe(
            'تاريخ القرار التمييزي'
        );

        expect(first[0].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.appealDeadline('first'))?.title).toBe(
            'آخر موعد طعن على الحكم'
        );
        expect(
            appeal[1].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.appealDeadline('appeal')),
        ).toBeUndefined();
    });

    it('cassation deadline on appeal stage uses تمييز context — not مرحلة الاستئناف', () => {
        const specs = collectStageLegalCalendarSpecs(
            {
                id: 'appeal-1',
                stageName: 'الاستئناف',
                legalTimers: { cassationDeadline: '2026-09-03' },
            },
            1,
        );
        const cassation = specs.find((s) => s.id === LAWSUIT_CAL_APPT.cassationDeadline('appeal-1'));
        expect(cassation?.title).toBe('مهلة التمييز');
        expect(cassation?.details).toContain('بعد الحكم الاستئنافي');
        expect(cassation?.details).not.toContain('مرحلة: الاستئناف');
    });

    it('skips appeal deadline mirror on appeal stage and correction stage', () => {
        const appealSpecs = collectStageLegalCalendarSpecs(
            {
                id: 'appeal-1',
                stageName: 'الاستئناف',
                appealDeadline: '2026-07-31',
            },
            1,
        );
        expect(
            appealSpecs.find((s) => s.id === LAWSUIT_CAL_APPT.appealDeadline('appeal-1'))?.date,
        ).toBeNull();

        const correctionSpecs = collectStageLegalCalendarSpecs(
            {
                id: 'corr-1',
                stageName: 'تصحيح قرار',
                legalTimers: { cassationDeadline: '2026-09-03' },
            },
            2,
        );
        expect(
            correctionSpecs.find((s) => s.id === LAWSUIT_CAL_APPT.cassationDeadline('corr-1'))?.date,
        ).toBeNull();
    });

    it('skips first-instance appeal deadline mirror on personal status stage', () => {
        const specs = collectStageLegalCalendarSpecs(
            {
                id: 'ps-1',
                stageName: 'أحوال شخصية',
                appealDeadline: '2026-07-31',
                legalTimers: { cassationDeadline: '2026-09-03' },
            },
            0,
        );
        expect(
            specs.find((s) => s.id === LAWSUIT_CAL_APPT.appealDeadline('ps-1'))?.date,
        ).toBeNull();
        expect(
            specs.find((s) => s.id === LAWSUIT_CAL_APPT.cassationDeadline('ps-1'))?.date,
        ).toBe('2026-09-03');
    });

    it('uses personal-status judgment labels — not civil بدائي terminology', () => {
        const specs = collectStageLegalCalendarSpecs(
            {
                id: 'ps-j',
                stageName: 'أحوال شخصية',
                decisionDate: '2026-06-15',
                finalDecision: 'إجابة الدعوى',
            },
            0,
        );
        const judgment = specs.find((s) => s.id === LAWSUIT_CAL_APPT.judgmentDate('ps-j'));
        expect(judgment?.title).toBe('تاريخ قرار أحوال شخصية');
        expect(judgment?.title).not.toContain('بدائي');
    });
});
