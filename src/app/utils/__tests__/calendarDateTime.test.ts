import { describe, expect, it } from 'vitest';
import { calendarEventToTimestamp } from '../calendarDateTime';

describe('calendarDateTime', () => {
    it('يعامل YYYY-MM-DD بدون وقت كنهاية اليوم المحلي', () => {
        const ts = calendarEventToTimestamp('2026-05-20', undefined, 'end');
        expect(ts).not.toBeNull();
        const d = new Date(ts!);
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(4);
        expect(d.getDate()).toBe(20);
        expect(d.getHours()).toBe(23);
    });

    it('يحلل التاريخ مع وقت محلي', () => {
        const ts = calendarEventToTimestamp('2026-05-20', '14:30', 'start');
        const d = new Date(ts!);
        expect(d.getHours()).toBe(14);
        expect(d.getMinutes()).toBe(30);
    });
});
