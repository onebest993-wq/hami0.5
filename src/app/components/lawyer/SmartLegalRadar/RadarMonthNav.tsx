import React from 'react';
import { RADAR_MONTH_NAV } from './radarTheme';
import { RadarMonthToolbar } from './RadarMonthToolbar';
import { RadarMonthCaption } from './RadarMonthCaption';
import { RadarWeekStrip } from './RadarWeekStrip';

export const MonthNav = React.memo(function MonthNav({
    viewYear,
    viewMonth,
    onPrevMonth,
    onNextMonth,
    onGoToToday,
    showFullMonth,
    onToggleFullMonth,
    selectedDate,
    onSelectDate,
    datesWithEvents,
}: {
    viewYear: number;
    viewMonth: number;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onGoToToday: () => void;
    showFullMonth: boolean;
    onToggleFullMonth: () => void;
    selectedDate?: string;
    onSelectDate: (ymd: string) => void;
    datesWithEvents?: ReadonlySet<string>;
}) {
    return (
        <div className={RADAR_MONTH_NAV} dir="rtl" data-testid="radar-month-nav">
            <RadarMonthToolbar
                viewYear={viewYear}
                viewMonth={viewMonth}
                onPrevMonth={onPrevMonth}
                onNextMonth={onNextMonth}
                showFullMonth={showFullMonth}
                onToggleFullMonth={onToggleFullMonth}
            />

            <RadarMonthCaption selectedDate={selectedDate} onGoToToday={onGoToToday} />

            {selectedDate ? (
                <RadarWeekStrip
                    selectedDate={selectedDate}
                    viewMonth={viewMonth}
                    onSelectDate={onSelectDate}
                    datesWithEvents={datesWithEvents}
                />
            ) : null}
        </div>
    );
});
