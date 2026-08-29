import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartLegalRadarView } from '@/app/components/lawyer/SmartLegalRadar/hooks/useSmartLegalRadarView';

describe('useSmartLegalRadarView', () => {
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
});
