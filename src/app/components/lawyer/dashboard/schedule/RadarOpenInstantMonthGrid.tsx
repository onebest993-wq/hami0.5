import React from 'react';
import { CALENDAR_WEEK_DAYS } from '@/app/services/calendar/calendarArabicLabels';
import { buildCalendarGridAriaLabel } from '@/app/services/calendar/calendarMonthMath';
import {
    radarOpenInstantMonthCellClass,
    type RadarOpenInstantMonthCell,
} from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel';
import { RADAR_CALENDAR_SHELL } from '@/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeClasses';

type RadarOpenInstantMonthGridProps = {
    visible: boolean;
    viewYear: number;
    viewMonth: number;
    firstDayOfMonth: number;
    cells: RadarOpenInstantMonthCell[];
    onSelectDay: (ymd: string) => void;
};

export const RadarOpenInstantMonthGrid = React.memo(function RadarOpenInstantMonthGrid({
    visible,
    viewYear,
    viewMonth,
    firstDayOfMonth,
    cells,
    onSelectDay,
}: RadarOpenInstantMonthGridProps) {
    const gridAriaLabel = buildCalendarGridAriaLabel(viewMonth, viewYear);

    return (
        <div
            className="hami-radar-calendar-collapse"
            data-open={visible ? '1' : '0'}
            data-testid="radar-calendar-collapse"
            aria-hidden={!visible}
        >
            <div className="hami-radar-calendar-collapse__inner">
                <div
                    id="radar-calendar-grid"
                    className={RADAR_CALENDAR_SHELL}
                    dir="rtl"
                    data-testid="radar-calendar-grid"
                >
                    <div className="relative px-0 py-0.5">
                        <div className="grid grid-cols-7 gap-1 mb-1.5">
                            {CALENDAR_WEEK_DAYS.map((d) => (
                                <span
                                    key={d}
                                    className="text-[10px] font-semibold hami-radar-text-secondary text-center py-1"
                                >
                                    {d}
                                </span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1" role="group" aria-label={gridAriaLabel}>
                            {Array.from({ length: firstDayOfMonth }, (_, i) => (
                                <div key={`empty-${i}`} className="aspect-square min-h-[44px] w-full" />
                            ))}
                            {cells.map((cell) => (
                                <button
                                    key={cell.ymd}
                                    type="button"
                                    data-testid={`radar-day-${cell.day}`}
                                    aria-label={cell.ariaLabel}
                                    aria-pressed={cell.selected ? true : undefined}
                                    aria-current={cell.today ? 'date' : undefined}
                                    onClick={() => onSelectDay(cell.ymd)}
                                    className={radarOpenInstantMonthCellClass(cell)}
                                >
                                    {cell.eventCount > 0 && !cell.selected ? (
                                        <span className="absolute top-1 left-1 min-w-[14px] h-[14px] px-0.5 rounded-full hami-radar-accent-chip text-[8px] font-semibold hami-radar-text-primary flex items-center justify-center leading-none">
                                            {cell.eventCount > 9 ? '9+' : cell.eventCount}
                                        </span>
                                    ) : null}
                                    <span className={cell.selected ? 'font-semibold' : ''}>{cell.day}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
