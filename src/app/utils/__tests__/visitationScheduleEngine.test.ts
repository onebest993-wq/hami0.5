import { describe, expect, it } from 'vitest';
import {
    generateVisitationSessions,
    findNextVisitationSession,
    findNearestScheduledSession,
    getVisitationDocumentationActions,
    syncRollingCalendarSessions,
    isVisitationSessionDocumented,
    sanitizeVisitationSession,
    sessionCalendarLabel,
    validateVisitationScheduleConfig,
    weekOfMonthFromDate,
    parseYmdToLocalDate,
    resolveFirstMatchingAppointmentDate,
    applyAutoResolvedAnchor,
    formatSmartFirstAppointmentMessage,
    VISITATION_CALENDAR_WINDOW_MONTHS,
} from '../visitationScheduleEngine';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';

const baseConfig = (): VisitationScheduleConfig => ({
    decisionMode: 'viewing_pickup',
    location: 'مديرية التنفيذ',
    startTime: '10:00',
    endTime: '14:00',
    executionStartDate: '2026-06-01',
    anchorDate: '2026-06-04',
    weekDays: [4, 5],
    monthWeeks: [1, 3],
});

describe('visitationScheduleEngine', () => {
    it('computes week of month 1–4', () => {
        expect(weekOfMonthFromDate(parseYmdToLocalDate('2026-06-01')!)).toBe(1);
        expect(weekOfMonthFromDate(parseYmdToLocalDate('2026-06-08')!)).toBe(2);
        expect(weekOfMonthFromDate(parseYmdToLocalDate('2026-06-29')!)).toBe(4);
    });

    it('auto-resolves first matching date from execution start', () => {
        const first = resolveFirstMatchingAppointmentDate('2026-06-01', [5], [1]);
        expect(first).toBeTruthy();
        const d = parseYmdToLocalDate(first!)!;
        expect(d.getDay()).toBe(5);
        expect(Math.ceil(d.getDate() / 7)).toBe(1);
        expect(first! >= '2026-06-01').toBe(true);
    });

    it('applyAutoResolvedAnchor sets anchorDate from rules', () => {
        const resolved = applyAutoResolvedAnchor({
            executionStartDate: '2026-10-01',
            weekDays: [5],
            monthWeeks: [1, 3],
            decisionMode: 'viewing_pickup',
            location: 'x',
            startTime: '09:00',
            endTime: '12:00',
        });
        expect(resolved.anchorDate).toBeTruthy();
        expect(formatSmartFirstAppointmentMessage(resolved.anchorDate!)).toContain('النظام الذكي');
    });

    it('generates sessions within anchor month only', () => {
        const sessions = generateVisitationSessions(baseConfig());
        expect(sessions.length).toBeGreaterThan(0);
        for (const s of sessions) {
            const d = parseYmdToLocalDate(s.date)!;
            expect([4, 5]).toContain(d.getDay());
            expect([1, 3]).toContain(Math.ceil(d.getDate() / 7));
            expect(s.date >= '2026-06-04').toBe(true);
            expect(d.getMonth()).toBe(5);
            expect(d.getFullYear()).toBe(2026);
        }
    });

    it('finds next scheduled session from today', () => {
        const sessions = generateVisitationSessions(baseConfig());
        const next = findNextVisitationSession(sessions, '2026-06-01');
        expect(next?.status).toBe('scheduled');
        expect(next!.date >= '2026-06-01').toBe(true);
    });

    it('validates required setup fields', () => {
        expect(validateVisitationScheduleConfig({})).toMatch(/تاريخ/);
        expect(validateVisitationScheduleConfig(baseConfig())).toBeNull();
    });

    it('extends calendar window to four months', () => {
        expect(VISITATION_CALENDAR_WINDOW_MONTHS).toBe(4);
        const rolled = syncRollingCalendarSessions(baseConfig(), [], '2026-06-15');
        const months = new Set(
            rolled.map((s) => {
                const d = parseYmdToLocalDate(s.date)!;
                return `${d.getFullYear()}-${d.getMonth()}`;
            })
        );
        expect(months.size).toBeGreaterThanOrEqual(2);
        expect(rolled.every((s) => s.date >= '2026-06-01' && s.date <= '2026-09-30')).toBe(true);
    });

    it('finds nearest scheduled session (due or upcoming)', () => {
        const sessions = generateVisitationSessions(baseConfig());
        const nearest = findNearestScheduledSession(sessions, '2026-06-01');
        expect(nearest?.status).toBe('scheduled');
        expect(nearest!.date >= '2026-06-04').toBe(true);
    });

    it('derives documentation labels from decision mode', () => {
        const viewing = getVisitationDocumentationActions('viewing_only');
        expect(viewing.successLabel).toContain('المشاهدة');
        const pickup = getVisitationDocumentationActions('viewing_pickup');
        expect(pickup.absenceLabel).toContain('الاستصحاب');
    });

    it('treats only documentedAt sessions as documented for calendar', () => {
        const fake = {
            id: 'vs-2026-06-27-5',
            date: '2026-06-27',
            dayLabel: 'جمعة',
            status: 'completed' as const,
        };
        const real = {
            ...fake,
            documentedAt: '2026-06-27T10:00:00.000Z',
        };
        expect(isVisitationSessionDocumented(fake)).toBe(false);
        expect(isVisitationSessionDocumented(real)).toBe(true);
        expect(sanitizeVisitationSession(fake).status).toBe('scheduled');
        expect(sessionCalendarLabel(fake, 'viewing_pickup', '2026-06-28')).toBe('لم يُوثَّق بعد');
        expect(sessionCalendarLabel(real, 'viewing_pickup', '2026-06-28')).toContain('استصحاب');
    });
});
