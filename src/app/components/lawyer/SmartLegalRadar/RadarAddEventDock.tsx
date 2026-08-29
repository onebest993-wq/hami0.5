import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { formatRadarSelectedDayTitle } from './radarCalendarMath';
import { RADAR_ADD_DOCK, RADAR_BTN_ADD } from './radarTheme';

type RadarAddEventDockProps = {
    selectedDate: string;
    onAddEvent: () => void;
};

export const RadarAddEventDock = React.memo(function RadarAddEventDock({
    selectedDate,
    onAddEvent,
}: RadarAddEventDockProps) {
    const dayLabel = formatRadarSelectedDayTitle(selectedDate, 'اليوم المحدد');

    return (
        <div className={RADAR_ADD_DOCK} data-testid="radar-day-actions">
            <button
                type="button"
                onClick={onAddEvent}
                data-testid="radar-add-event"
                className={RADAR_BTN_ADD}
                aria-label={`إضافة موعد ليوم ${dayLabel}`}
            >
                <Plus size={16} aria-hidden />
                إضافة موعد
            </button>
        </div>
    );
});
