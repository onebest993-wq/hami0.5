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
});
