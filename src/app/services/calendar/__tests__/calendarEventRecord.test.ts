import { describe, expect, it } from 'vitest';
import { isUsableCalendarEventRecord } from '@/app/services/calendar/calendarEventRecord';

describe('isUsableCalendarEventRecord', () => {
    it('يقبل صفاً مكتمل الحقول الدنيا', () => {
        expect(
            isUsableCalendarEventRecord({
                id: 'ev-1',
                userId: 'u1',
                title: 'جلسة',
                date: '2026-08-30',
            }),
        ).toBe(true);
    });

    it('يرفض null والتاريخ الفارغ', () => {
        expect(isUsableCalendarEventRecord(null)).toBe(false);
        expect(
            isUsableCalendarEventRecord({
                id: 'ev-1',
                userId: 'u1',
                title: 'جلسة',
                date: '  ',
            }),
        ).toBe(false);
    });
});
