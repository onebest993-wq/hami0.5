import { describe, expect, it, vi } from 'vitest';
import {
    mapAllCalendarEventsForSparkScan,
    mapStoredEventsToUnified,
} from '@/app/components/lawyer/SmartLegalRadar/calendarEventMapping';
import type { CalendarEvent } from '@/app/services/lawyer-cloud';

vi.mock('@/app/services/calendar/calendarEventAuthorship', () => ({
    isBridgedCalendarEvent: (e: CalendarEvent) => Boolean(e.sourceModule),
    isUserAuthoredBridgedCalendarEvent: () => true,
}));

describe('mapStoredEventsToUnified', () => {
    it('يحوّل موعداً عادياً', () => {
        const stored: CalendarEvent = {
            id: 'abc',
            title: 'جلسة',
            date: '2026-06-01',
            type: 'hearing',
        };
        const out = mapStoredEventsToUnified([stored]);
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({
            id: 'cal_abc',
            title: 'جلسة',
            date: '2026-06-01',
            source: 'calendar',
            isBridged: false,
        });
        expect(out[0].bridge).toBeUndefined();
    });

    it('يضيف bridge للمواعيد المرتبطة', () => {
        const stored: CalendarEvent = {
            id: 'xyz',
            title: 'موعد مرتبط',
            date: '2026-06-02',
            type: 'custom',
            sourceModule: 'case',
            sourceEntityId: 'case-1',
            sourceEventId: 'evt-1',
        };
        const out = mapStoredEventsToUnified([stored]);
        expect(out[0].isBridged).toBe(true);
        expect(out[0].bridge).toEqual({
            sourceModule: 'case',
            sourceEntityId: 'case-1',
            sourceEventId: 'evt-1',
            calendarRecordId: 'xyz',
        });
    });

    it('يستخرج المحكمة من الملاحظات في مسح سبارك', () => {
        const stored: CalendarEvent = {
            id: 'court-1',
            title: 'جلسة',
            date: '2026-06-03',
            type: 'hearing',
            notes: 'المحكمة: محكمة الكرخ',
        };
        const out = mapAllCalendarEventsForSparkScan([stored]);
        expect(out[0]?.court).toBe('محكمة الكرخ');
    });
});
