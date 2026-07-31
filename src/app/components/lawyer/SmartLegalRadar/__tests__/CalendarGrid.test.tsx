import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarGrid } from '@/app/components/lawyer/SmartLegalRadar/CalendarGrid';
import { MONTHS, todayYmd } from '@/app/components/lawyer/SmartLegalRadar/utils';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

function renderGrid(overrides?: Partial<React.ComponentProps<typeof CalendarGrid>>) {
    const now = new Date();
    const viewYear = now.getFullYear();
    const viewMonth = now.getMonth();
    return render(
        <CalendarGrid
            viewYear={viewYear}
            viewMonth={viewMonth}
            firstDayOfMonth={new Date(viewYear, viewMonth, 1).getDay()}
            daysInMonth={new Date(viewYear, viewMonth + 1, 0).getDate()}
            selectedDate={todayYmd()}
            eventsByDate={new Map<string, UnifiedEvent[]>()}
            onDateClick={vi.fn()}
            {...overrides}
        />,
    );
}

describe('CalendarGrid a11y', () => {
    it('اليوم المحدد aria-pressed واليوم الحالي aria-current="date"', () => {
        renderGrid();
        const today = new Date().getDate();
        const cell = screen.getByTestId(`radar-day-${today}`);
        expect(cell).toHaveAttribute('aria-pressed', 'true');
        expect(cell).toHaveAttribute('aria-current', 'date');
    });

    it('تسمية الخلية عربية مقروءة وتذكر عدد المواعيد', () => {
        const now = new Date();
        const ymd = todayYmd();
        const events: UnifiedEvent[] = [
            { id: 'e1', title: 'جلسة', date: ymd, type: 'hearing', source: 'calendar' },
            { id: 'e2', title: 'استشارة', date: ymd, type: 'consultation', source: 'calendar' },
        ];
        renderGrid({ eventsByDate: new Map([[ymd, events]]) });
        const cell = screen.getByTestId(`radar-day-${now.getDate()}`);
        expect(cell.getAttribute('aria-label')).toBe(
            `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}، اليوم، 2 مواعيد`,
        );
    });

    it('الشبكة مجموعة موسومة باسم الشهر', () => {
        const now = new Date();
        renderGrid();
        expect(
            screen.getByRole('group', {
                name: `تقويم ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
            }),
        ).toBeInTheDocument();
    });
});
