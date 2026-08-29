import { describe, expect, it } from 'vitest';
import { buildWeekStrip, monthGridMetrics, selectedDateAfterMonthShift } from '@/app/components/lawyer/SmartLegalRadar/radarCalendarMath';

describe('buildWeekStrip', () => {
    it('يعيد أحد→سبت للأسبوع الذي يقع فيه التاريخ', () => {
        const week = buildWeekStrip('2026-08-13');
        expect(week).toEqual([
            '2026-08-09',
            '2026-08-10',
            '2026-08-11',
            '2026-08-12',
            '2026-08-13',
            '2026-08-14',
            '2026-08-15',
        ]);
    });

    it('يعيد فارغاً لتاريخ غير صالح', () => {
        expect(buildWeekStrip('not-a-date')).toEqual([]);
    });
});

describe('selectedDateAfterMonthShift', () => {
    it('يثبّت 31 كانون الثاني إلى 28 شباط في سنة غير كبيسة', () => {
        expect(selectedDateAfterMonthShift('2026-01-31', 2026, 0, 1)).toEqual({
            year: 2026,
            month: 1,
            selectedDate: '2026-02-28',
        });
        expect(selectedDateAfterMonthShift('2026-12-15', 2026, 11, 1)).toEqual({
            year: 2027,
            month: 0,
            selectedDate: '2027-01-15',
        });
    });
});

describe('monthGridMetrics', () => {
    it('يحسب أيام الشهر ويوم البداية دون الاعتماد على React', () => {
        expect(monthGridMetrics(2026, 7)).toEqual({
            daysInMonth: 31,
            firstDayOfMonth: 6,
        });
    });
});
