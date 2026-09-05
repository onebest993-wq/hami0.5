import { describe, expect, it, beforeEach } from 'vitest';
import {
    consumeCalendarShellFormIntent,
    focusCalendarShellDate,
    patchCalendarShellSession,
    peekCalendarShellSession,
    requestCalendarShellAdd,
    requestCalendarShellEdit,
    resetCalendarShellSessionForTests,
    seedCalendarShellSession,
    applyCalendarShellMonthShift,
} from '@/app/services/calendar/calendarShellSession';

describe('calendarShellSession', () => {
    beforeEach(() => {
        resetCalendarShellSessionForTests();
    });

    it('يبذر اليوم ولا يعيد الكتابة إن وُجدت جلسة', () => {
        const first = seedCalendarShellSession(new Date('2026-08-30T12:00:00'));
        expect(first.selectedDate).toBe('2026-08-30');
        expect(seedCalendarShellSession(new Date('2026-01-01T12:00:00')).selectedDate).toBe(
            '2026-08-30',
        );
    });

    it('patch بدون تغيير لا يبدّل المرجع', () => {
        const seeded = seedCalendarShellSession(new Date('2026-08-30T12:00:00'));
        expect(patchCalendarShellSession({ selectedDate: '2026-08-30' })).toBe(seeded);
        const next = focusCalendarShellDate('2026-08-12');
        expect(next.selectedDate).toBe('2026-08-12');
        expect(next.viewMonth).toBe(7);
        expect(peekCalendarShellSession()?.showFullMonth).toBe(false);
        const shifted = applyCalendarShellMonthShift(1);
        expect(shifted.selectedDate).toBe('2026-09-12');
        expect(shifted.viewMonth).toBe(8);
    });

    it('يحفظ نية الإضافة والتعديل حتى الاستهلاك', () => {
        requestCalendarShellAdd();
        expect(consumeCalendarShellFormIntent()).toEqual({ kind: 'add' });
        expect(consumeCalendarShellFormIntent()).toBeNull();
        requestCalendarShellEdit('evt-9');
        expect(consumeCalendarShellFormIntent()).toEqual({ kind: 'edit', eventId: 'evt-9' });
        requestCalendarShellEdit('  ');
        expect(consumeCalendarShellFormIntent()).toBeNull();
    });
});
