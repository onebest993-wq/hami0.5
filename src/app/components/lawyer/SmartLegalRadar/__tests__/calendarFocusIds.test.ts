import { describe, expect, it } from 'vitest';
import {
    eventMatchesCalendarFocus,
    resolveHighlightUnifiedEventId,
    storedCalendarIdFromUnified,
    unifiedCalendarEventId,
} from '@/app/components/lawyer/SmartLegalRadar/calendarFocusIds';

describe('calendarFocusIds', () => {
    it('يطابق معرّف CalendarDB الخام مع بطاقة cal_ الموحّدة', () => {
        const event = { id: unifiedCalendarEventId('evt-9') };
        expect(eventMatchesCalendarFocus(event, 'evt-9')).toBe(true);
        expect(eventMatchesCalendarFocus(event, 'cal_evt-9')).toBe(true);
        expect(eventMatchesCalendarFocus(event, 'other')).toBe(false);
        expect(resolveHighlightUnifiedEventId([event], 'evt-9')).toBe('cal_evt-9');
        expect(storedCalendarIdFromUnified('cal_evt-9')).toBe('evt-9');
    });

    it('يطابق calendarRecordId للجسر', () => {
        const event = {
            id: 'cal_bridge-1',
            bridge: { calendarRecordId: 'stored-1' },
        };
        expect(eventMatchesCalendarFocus(event, 'stored-1')).toBe(true);
        expect(resolveHighlightUnifiedEventId([event], 'stored-1')).toBe('cal_bridge-1');
    });
});
