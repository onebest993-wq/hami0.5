import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthNav } from '@/app/components/lawyer/SmartLegalRadar/RadarMonthNav';

describe('RadarMonthNav', () => {
    const base = {
        viewYear: 2026,
        viewMonth: 7,
        onPrevMonth: vi.fn(),
        onNextMonth: vi.fn(),
        onGoToToday: vi.fn(),
        showFullMonth: false,
        onToggleFullMonth: vi.fn(),
        selectedDate: '2026-08-13',
        onSelectDate: vi.fn(),
        datesWithEvents: new Set(['2026-08-13']),
    };

    it('يعرض شريط الأسبوع ويختار يوماً منه', () => {
        render(<MonthNav {...base} />);
        expect(screen.getByTestId('radar-week-strip')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('radar-week-day-2026-08-12'));
        expect(base.onSelectDate).toHaveBeenCalledWith('2026-08-12');
    });

    it('زر التقويم الكامل يوسّم للقارئ ويُغلق', () => {
        const { rerender } = render(<MonthNav {...base} />);
        const toggle = screen.getByTestId('radar-toggle-full-month');
        expect(toggle).toHaveAttribute('aria-label', 'التقويم الكامل');
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(toggle).toHaveTextContent('الشهر');

        rerender(<MonthNav {...base} showFullMonth />);
        expect(toggle).toHaveAttribute('aria-label', 'إغلاق التقويم');
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(toggle).toHaveTextContent('إغلاق');
    });
});
