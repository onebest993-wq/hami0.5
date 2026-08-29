import React, { useMemo } from 'react';
import { WEEK_DAYS } from './radarCalendarLabels';
import {
    isToday,
    buildWeekStrip,
    buildCalendarDayAriaLabel,
} from './radarCalendarMath';

function weekDayClass(ymd: string, selectedDate: string, viewMonth: number): string {
    const isSel = ymd === selectedDate;
    const isT = isToday(ymd);
    const month = Number(ymd.slice(5, 7)) - 1;
    const muted = month !== viewMonth;
    const parts = ['hami-radar-week-strip__day'];
    if (isSel) parts.push('hami-radar-week-strip__day--selected');
    else if (isT) parts.push('hami-radar-week-strip__day--today');
    if (muted && !isSel) parts.push('hami-radar-week-strip__day--muted');
    return parts.join(' ');
}

type RadarWeekStripProps = {
    selectedDate: string;
    viewMonth: number;
    onSelectDate: (ymd: string) => void;
    datesWithEvents?: ReadonlySet<string>;
};

export const RadarWeekStrip = React.memo(function RadarWeekStrip({
    selectedDate,
    viewMonth,
    onSelectDate,
    datesWithEvents,
}: RadarWeekStripProps) {
    const weekDays = useMemo(() => buildWeekStrip(selectedDate), [selectedDate]);
    if (weekDays.length !== 7) return null;

    return (
        <div className="hami-radar-week-strip" data-testid="radar-week-strip" role="group" aria-label="أيام الأسبوع">
            {weekDays.map((ymd, index) => {
                const dayNum = Number(ymd.slice(8, 10));
                const month = Number(ymd.slice(5, 7)) - 1;
                const year = Number(ymd.slice(0, 4));
                const hasEvents = Boolean(datesWithEvents?.has(ymd));
                const isSel = ymd === selectedDate;
                return (
                    <button
                        key={ymd}
                        type="button"
                        data-testid={`radar-week-day-${ymd}`}
                        aria-pressed={isSel}
                        aria-current={isToday(ymd) ? 'date' : undefined}
                        aria-label={buildCalendarDayAriaLabel(
                            dayNum,
                            month,
                            year,
                            hasEvents ? 1 : 0,
                            isToday(ymd),
                        )}
                        onClick={() => onSelectDate(ymd)}
                        className={weekDayClass(ymd, selectedDate, viewMonth)}
                    >
                        <span className="hami-radar-week-strip__name">{WEEK_DAYS[index]}</span>
                        <span className="hami-radar-week-strip__num">{dayNum}</span>
                        <span
                            className={`hami-radar-week-strip__dot${hasEvents ? '' : ' hami-radar-week-strip__dot--empty'}`}
                            aria-hidden
                        />
                    </button>
                );
            })}
        </div>
    );
});
