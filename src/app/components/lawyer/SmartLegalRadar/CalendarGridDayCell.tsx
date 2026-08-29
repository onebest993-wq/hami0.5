import React from 'react';
import {
    isToday,
    isPastDay,
    buildCalendarDayAriaLabel,
} from './radarCalendarMath';
import { RADAR_TEXT, RADAR_ACCENT_CHIP } from './radarTheme';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

type CalendarGridDayCellProps = {
    day: number;
    dateStr: string;
    viewYear: number;
    viewMonth: number;
    selectedDate: string;
    dayEvents: UnifiedEvent[];
    onDateClick: (day: number) => void;
};

export const CalendarGridDayCell = React.memo(function CalendarGridDayCell({
    day,
    dateStr,
    viewYear,
    viewMonth,
    selectedDate,
    dayEvents,
    onDateClick,
}: CalendarGridDayCellProps) {
    const isSel = dateStr === selectedDate;
    const isT = isToday(dateStr);
    const isPast = isPastDay(dateStr);
    const hasEvents = dayEvents.length > 0;

    let cellClass =
        'relative aspect-square min-h-[44px] w-full rounded-lg flex flex-col items-center justify-center text-sm font-semibold border border-transparent touch-manipulation';

    if (isSel) {
        cellClass += ' hami-radar-day-selected z-10';
    } else if (isT) {
        cellClass += ' hami-radar-day-today';
    } else if (isPast) {
        cellClass += ' hami-radar-day-muted';
    } else if (hasEvents) {
        cellClass += ' hami-radar-day-has-events';
    } else {
        cellClass += ` ${RADAR_TEXT}`;
    }

    return (
        <button
            type="button"
            data-testid={`radar-day-${day}`}
            aria-label={buildCalendarDayAriaLabel(
                day,
                viewMonth,
                viewYear,
                dayEvents.length,
                isT,
            )}
            aria-pressed={isSel ? true : undefined}
            aria-current={isT ? 'date' : undefined}
            onClick={() => onDateClick(day)}
            className={cellClass}
        >
            {hasEvents && !isSel && (
                <span
                    className={`absolute top-1 left-1 min-w-[14px] h-[14px] px-0.5 rounded-full ${RADAR_ACCENT_CHIP} text-[8px] font-semibold ${RADAR_TEXT} flex items-center justify-center leading-none`}
                >
                    {dayEvents.length > 9 ? '9+' : dayEvents.length}
                </span>
            )}
            <span className={isSel ? 'font-semibold' : ''}>{day}</span>
        </button>
    );
});
