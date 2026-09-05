import { describe, expect, it } from 'vitest';
import {
    buildCalendarWeekStrip,
    formatCalendarSelectedDayCaption,
} from '@/app/services/calendar/calendarWeekStrip';

describe('calendarWeekStrip', () => {
    it('يعيد أحد→سبت للأسبوع الذي يقع فيه التاريخ', () => {
        expect(buildCalendarWeekStrip('2026-08-13')).toEqual([
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
        expect(buildCalendarWeekStrip('not-a-date')).toEqual([]);
    });

    it('يبني عنوان اليوم', () => {
        const caption = formatCalendarSelectedDayCaption('2026-08-25');
        expect(caption.title.length).toBeGreaterThan(3);
        expect(caption.meta.length).toBeGreaterThan(0);
    });
});
