import { describe, expect, it } from 'vitest';
import {
    calendarMonthGridMetrics,
    selectedDateAfterCalendarMonthShift,
} from '@/app/services/calendar/calendarMonthMath';

describe('calendarMonthMath', () => {
    it('يثبّت 31 كانون الثاني إلى 28 شباط في سنة غير كبيسة', () => {
        expect(selectedDateAfterCalendarMonthShift('2026-01-31', 2026, 0, 1)).toEqual({
            year: 2026,
            month: 1,
            selectedDate: '2026-02-28',
        });
        expect(selectedDateAfterCalendarMonthShift('2026-12-15', 2026, 11, 1)).toEqual({
            year: 2027,
            month: 0,
            selectedDate: '2027-01-15',
        });
    });

    it('يحسب أيام الشهر ويوم البداية', () => {
        expect(calendarMonthGridMetrics(2026, 7)).toEqual({
            daysInMonth: 31,
            firstDayOfMonth: 6,
        });
    });
});
