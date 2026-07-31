import React from 'react';
import { Plus } from 'lucide-react';
import { prefetchRadarEventForm } from '@/app/runtime/radarWidgetLoader';
import { RADAR_ADD_DOCK, RADAR_BTN_GOLD } from './radarTheme';

type RadarAddEventDockProps = {
    selectedDate: string;
    onAddEvent: () => void;
};

function formatSelectedDayLabel(selectedDate: string): string {
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return 'اليوم المحدد';
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }).format(d);
    } catch {
        return selectedDate;
    }
}

/** زر إضافة الموعد فقط — بدون شريط/حاوية ضخمة */
export const RadarAddEventDock = React.memo(function RadarAddEventDock({
    selectedDate,
    onAddEvent,
}: RadarAddEventDockProps) {
    const dayLabel = formatSelectedDayLabel(selectedDate);

    return (
        <div className={RADAR_ADD_DOCK} data-testid="radar-day-actions">
            <button
                type="button"
                onClick={onAddEvent}
                onPointerEnter={prefetchRadarEventForm}
                onPointerDown={prefetchRadarEventForm}
                data-testid="radar-add-event"
                className={`${RADAR_BTN_GOLD} w-full`}
                aria-label={`إضافة موعد ليوم ${dayLabel}`}
            >
                <Plus size={16} aria-hidden />
                إضافة موعد
            </button>
        </div>
    );
});
