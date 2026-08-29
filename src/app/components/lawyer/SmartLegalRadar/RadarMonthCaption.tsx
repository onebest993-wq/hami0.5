import React from 'react';
import { formatRadarSelectedDayCaption, isToday } from './radarCalendarMath';
import { RADAR_TEXT, RADAR_TEXT_MUTED } from './radarTheme';

type RadarMonthCaptionProps = {
    selectedDate?: string;
    onGoToToday: () => void;
};

export const RadarMonthCaption = React.memo(function RadarMonthCaption({
    selectedDate,
    onGoToToday,
}: RadarMonthCaptionProps) {
    const todaySelected = Boolean(selectedDate && isToday(selectedDate));
    const dayLabel = selectedDate ? formatRadarSelectedDayCaption(selectedDate) : null;

    return (
        <div
            className="hami-radar-month-nav__caption"
            data-testid="radar-selected-day-label"
            aria-live="polite"
        >
            <div className="min-w-0 text-right">
                <p className={`truncate text-[13px] sm:text-sm font-bold leading-tight ${RADAR_TEXT}`}>
                    {dayLabel?.title ?? 'اختر تاريخاً'}
                </p>
                {dayLabel?.meta ? (
                    <p className={`truncate text-[10px] sm:text-[11px] mt-0.5 ${RADAR_TEXT_MUTED}`}>
                        {dayLabel.meta}
                    </p>
                ) : null}
            </div>

            {todaySelected ? (
                <span className="hami-radar-month-nav__today-badge shrink-0">اليوم</span>
            ) : (
                <button
                    type="button"
                    onClick={onGoToToday}
                    className="hami-radar-month-nav__today-btn shrink-0 min-h-[44px] px-3 text-[11px] font-semibold touch-manipulation"
                    data-testid="radar-today"
                >
                    اليوم
                </button>
            )}
        </div>
    );
});
