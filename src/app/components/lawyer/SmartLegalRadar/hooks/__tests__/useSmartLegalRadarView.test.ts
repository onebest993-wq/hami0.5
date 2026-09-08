import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useSmartLegalRadarView,
    markRadarZoneSwitch,
    getRadarZoneSwitchMs,
} from '@/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarView';
import { resetCalendarShellSessionForTests } from '@/app/services/calendar/calendarShellSession';

describe('useSmartLegalRadarView', () => {
    beforeEach(() => {
        resetCalendarShellSessionForTests();
        if (typeof performance !== 'undefined') {
            try { performance.clearMarks(); } catch { /* ignore */ }
        }
    });
    it('ينقل اليوم المحدد مع الشهر حتى لا ينفصل شريط الأسبوع', () => {
        const { result } = renderHook(() => useSmartLegalRadarView('2026-01-31'));

        expect(result.current.viewYear).toBe(2026);
        expect(result.current.viewMonth).toBe(0);
        expect(result.current.selectedDate).toBe('2026-01-31');

        act(() => {
            result.current.nextMonth();
        });

        expect(result.current.viewYear).toBe(2026);
        expect(result.current.viewMonth).toBe(1);
        expect(result.current.selectedDate).toBe('2026-02-28');

        act(() => {
            result.current.prevMonth();
        });

        expect(result.current.viewMonth).toBe(0);
        expect(result.current.selectedDate).toBe('2026-01-28');
    });

    it('يعبر السنة عند كانون الأول/كانون الثاني', () => {
        const { result } = renderHook(() => useSmartLegalRadarView('2026-12-15'));

        act(() => {
            result.current.nextMonth();
        });

        expect(result.current.viewYear).toBe(2027);
        expect(result.current.viewMonth).toBe(0);
        expect(result.current.selectedDate).toBe('2027-01-15');
    });

    it('يرجع null بدون zone marks عند حساب زمن انتقال المناطق', () => {
        expect(getRadarZoneSwitchMs('prev-month', 'next-month')).toBeNull();
    });

    it('يستخدم آخر mark لمنطقة التبديل عند تعدد العلامات (آخر مؤشر)', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:calendar:zone:prev-month') {
                return [{ startTime: 500 }, { startTime: 1500 }] as PerformanceEntryList;
            }
            if (name === 'hami:calendar:zone:next-month') {
                return [{ startTime: 600 }, { startTime: 1830 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getRadarZoneSwitchMs('prev-month', 'next-month')).toBe(330);
    });

    it('يرجع null إذا كانت دلتا منطقة التبديل سالبة', () => {
        vi.spyOn(performance, 'getEntriesByName').mockImplementation((name: string) => {
            if (name === 'hami:calendar:zone:prev-month') {
                return [{ startTime: 2000 }] as PerformanceEntryList;
            }
            if (name === 'hami:calendar:zone:next-month') {
                return [{ startTime: 1500 }] as PerformanceEntryList;
            }
            return [] as PerformanceEntryList;
        });
        expect(getRadarZoneSwitchMs('prev-month', 'next-month')).toBeNull();
    });

    it('markRadarZoneSwitch لا يرمي استثناء عند عدم وجود performance API', () => {
        const origPerf = (globalThis as unknown as Record<string, unknown>).performance;
        try {
            (globalThis as unknown as Record<string, unknown>).performance = undefined as unknown as Performance;
            expect(() => markRadarZoneSwitch('today')).not.toThrow();
            expect(getRadarZoneSwitchMs('today', 'next-month')).toBeNull();
        } finally {
            (globalThis as unknown as Record<string, unknown>).performance = origPerf;
        }
    });
});
