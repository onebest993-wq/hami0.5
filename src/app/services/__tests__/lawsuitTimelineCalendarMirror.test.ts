import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    LAWSUIT_CAL_APPT,
    mirrorSessionNextHearingToCalendar,
    mirrorStageLegalDatesToCalendar,
} from '../lawsuitTimelineCalendarMirror';
import { syncLawsuitTimelineAppointment } from '../calendarDossierSync';

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
            'تاريخ الحكم البدائي'
        );
        expect(appeal[1].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.judgmentDate('appeal'))?.title).toBe(
            'تاريخ الحكم الاستئنافي'
        );
        expect(cass[2].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.judgmentDate('cass'))?.title).toBe(
            'تاريخ القرار التمييزي'
        );

        expect(first[0].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.appealDeadline('first'))?.title).toBe(
            'آخر موعد طعن على الحكم البدائي'
        );
        expect(appeal[1].timeline?.find((e) => e.id === LAWSUIT_CAL_APPT.appealDeadline('appeal'))?.title).toBe(
            'آخر موعد طعن على الحكم الاستئنافي'
        );
    });
});
