import React from 'react';
import { WEEK_DAYS } from './radarCalendarLabels';
import { buildCalendarGridAriaLabel } from './radarCalendarMath';
import {
    RADAR_CALENDAR_SHELL,
    RADAR_TEXT_MUTED,
} from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { CalendarGridDayCell } from './CalendarGridDayCell';

interface CalendarGridProps {
    viewYear: number;
    viewMonth: number;
    firstDayOfMonth: number;
    daysInMonth: number;
    selectedDate: string;
    eventsByDate: Map<string, UnifiedEvent[]>;
    onDateClick: (day: number) => void;
}

export const CalendarGrid = React.memo(function CalendarGrid({
    viewYear,
    viewMonth,
    firstDayOfMonth,
    daysInMonth,
    selectedDate,
    eventsByDate,
    onDateClick,
}: CalendarGridProps) {
    const gridAriaLabel = buildCalendarGridAriaLabel(viewMonth, viewYear);

    return (
        <div
            id="radar-calendar-grid"
            className={RADAR_CALENDAR_SHELL}
            dir="rtl"
            data-testid="radar-calendar-grid"
        >
            <div className="relative px-0 py-1">
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
                    {WEEK_DAYS.map((d) => (
                        <span
                            key={d}
                            className={`text-[10px] font-semibold ${RADAR_TEXT_MUTED} text-center py-1`}
                        >
                            {d}
                        </span>
                    ))}
                </div>

                <div
                    className="grid grid-cols-7 gap-1.5 sm:gap-2"
                    role="group"
                    aria-label={gridAriaLabel}
                >
                    {Array.from({ length: firstDayOfMonth }, (_, i) => (
                        <div key={`empty-${i}`} className="aspect-square min-h-[44px] w-full" />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        return (
                            <CalendarGridDayCell
                                key={day}
                                day={day}
                                dateStr={dateStr}
                                viewYear={viewYear}
                                viewMonth={viewMonth}
                                selectedDate={selectedDate}
                                dayEvents={eventsByDate.get(dateStr) ?? []}
                                onDateClick={onDateClick}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
});
