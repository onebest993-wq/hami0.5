import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSmartLegalRadarSchedule } from '@/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarSchedule';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

function event(id: string, date = '2026-08-22'): UnifiedEvent {
    return {
        id,
        title: id,
        date,
        type: 'custom',
        source: 'calendar',
    };
}

describe('useSmartLegalRadarSchedule — تركيز البحث', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يحوّل eventId الخام إلى معرّف البطاقة الموحّد', () => {
        const allEvents = [event('cal_evt-9')];
        const getEventsForDate = vi.fn(() => allEvents);
        const { result } = renderHook(() =>
            useSmartLegalRadarSchedule(
                allEvents,
                getEventsForDate,
                { viewYear: 2026, viewMonth: 7, selectedDate: '2026-08-22' },
                'evt-9',
            ),
        );
        expect(result.current.highlightEventId).toBe('cal_evt-9');
    });

    it('يزيل التمييز بعد 8 ثوان', () => {
        const allEvents = [event('cal_evt-9')];
        const { result } = renderHook(() =>
            useSmartLegalRadarSchedule(
                allEvents,
                vi.fn(() => allEvents),
                { viewYear: 2026, viewMonth: 7, selectedDate: '2026-08-22' },
                'evt-9',
            ),
        );
        expect(result.current.highlightEventId).toBe('cal_evt-9');
        act(() => {
            vi.advanceTimersByTime(8000);
        });
        expect(result.current.highlightEventId).toBeUndefined();
    });
});
