import React from 'react';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { MONTHS } from './radarCalendarLabels';
import {
    RADAR_BTN_GHOST,
    RADAR_BTN_GHOST_ACTIVE,
    RADAR_NAV_ICON_BTN,
    RADAR_TEXT,
} from './radarTheme';

type RadarMonthToolbarProps = {
    viewYear: number;
    viewMonth: number;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    showFullMonth: boolean;
    onToggleFullMonth: () => void;
};

export const RadarMonthToolbar = React.memo(function RadarMonthToolbar({
    viewYear,
    viewMonth,
    onPrevMonth,
    onNextMonth,
    showFullMonth,
    onToggleFullMonth,
}: RadarMonthToolbarProps) {
    return (
        <div className="hami-radar-month-nav__month-row flex items-center gap-2 min-w-0 w-full">
            <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
                <button
                    type="button"
                    data-testid="radar-prev-month"
                    onClick={onPrevMonth}
                    aria-label="الشهر السابق"
                    className={RADAR_NAV_ICON_BTN}
                >
                    <ChevronRight size={18} />
                </button>
                <p
                    className={`min-w-0 px-1 text-center text-[15px] sm:text-base font-bold tabular-nums truncate ${RADAR_TEXT}`}
                    aria-live="polite"
                    data-testid="radar-month-label"
                >
                    {MONTHS[viewMonth]} {viewYear}
                </p>
                <button
                    type="button"
                    data-testid="radar-next-month"
                    onClick={onNextMonth}
                    aria-label="الشهر التالي"
                    className={RADAR_NAV_ICON_BTN}
                >
                    <ChevronLeft size={18} />
                </button>
            </div>

            <button
                type="button"
                onClick={onToggleFullMonth}
                data-testid="radar-toggle-full-month"
                aria-label={showFullMonth ? 'إغلاق التقويم' : 'التقويم الكامل'}
                aria-expanded={showFullMonth}
                aria-controls="radar-calendar-grid"
                className={`${showFullMonth ? RADAR_BTN_GHOST_ACTIVE : RADAR_BTN_GHOST} hami-radar-month-nav__calendar-btn shrink-0`}
            >
                {showFullMonth ? 'إغلاق' : 'الشهر'}
            </button>
        </div>
    );
});
