import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarGridHost } from '@/app/components/lawyer/SmartLegalRadar/CalendarGridHost';
import { todayYmd } from '@/app/components/lawyer/SmartLegalRadar/radarCalendarMath';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

describe('CalendarGridHost', () => {
    const now = new Date();
    const gridProps = {
        viewYear: now.getFullYear(),
        viewMonth: now.getMonth(),
        firstDayOfMonth: new Date(now.getFullYear(), now.getMonth(), 1).getDay(),
        daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
        selectedDate: todayYmd(),
        eventsByDate: new Map<string, UnifiedEvent[]>(),
        onDateClick: vi.fn(),
    };

    it('لا يركّب الشبكة قبل أول فتح', () => {
        render(<CalendarGridHost {...gridProps} visible={false} />);
        expect(screen.queryByTestId('radar-calendar-grid')).toBeNull();
    });

    it('يبقي الشبكة مركّبة ومخفية بعد الإغلاق', () => {
        const { rerender } = render(<CalendarGridHost {...gridProps} visible />);
        expect(screen.getByTestId('radar-calendar-grid')).toBeInTheDocument();
        expect(screen.getByTestId('radar-calendar-collapse')).toHaveAttribute('data-open', '1');

        rerender(<CalendarGridHost {...gridProps} visible={false} />);
        expect(screen.getByTestId('radar-calendar-grid')).toBeInTheDocument();
        expect(screen.getByTestId('radar-calendar-collapse')).toHaveAttribute('data-open', '0');
        expect(screen.getByTestId('radar-calendar-collapse')).toHaveAttribute('aria-hidden', 'true');
    });
});
