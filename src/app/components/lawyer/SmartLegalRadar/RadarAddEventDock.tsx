import React from 'react';
import { Plus } from '@/app/components/ui/lucideIcons';
import { prefetchRadarEventForm } from '@/app/runtime/radarWidgetLoader';
import { RADAR_ADD_DOCK, RADAR_BTN_ADD } from './radarTheme';

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

function RadarAddEventDockChrome({
    children,
    ariaHidden,
}: {
    children: React.ReactNode;
    ariaHidden?: boolean;
}) {
    return (
        <div className={RADAR_ADD_DOCK} data-testid="radar-day-actions" aria-hidden={ariaHidden}>
            {children}
        </div>
    );
}

/** هيكل مرساة الإضافة — يمنع قفزة التخطيط قبل اكتمال chunk الرادار */
export function RadarAddEventDockPlaceholder(): React.ReactElement {
    return (
        <RadarAddEventDockChrome ariaHidden>
            <div
                className={`${RADAR_BTN_ADD} pointer-events-none select-none`}
                data-testid="radar-add-event"
                aria-hidden
            >
                <Plus size={16} aria-hidden />
                إضافة موعد
            </div>
        </RadarAddEventDockChrome>
    );
}

/** زر إضافة الموعد فقط — بدون شريط/حاوية ضخمة */
export const RadarAddEventDock = React.memo(function RadarAddEventDock({
    selectedDate,
    onAddEvent,
}: RadarAddEventDockProps) {
    const dayLabel = formatSelectedDayLabel(selectedDate);

    return (
        <RadarAddEventDockChrome>
            <button
                type="button"
                onClick={onAddEvent}
                onPointerEnter={prefetchRadarEventForm}
                onPointerDown={prefetchRadarEventForm}
                data-testid="radar-add-event"
                className={RADAR_BTN_ADD}
                aria-label={`إضافة موعد ليوم ${dayLabel}`}
            >
                <Plus size={16} aria-hidden />
                إضافة موعد
            </button>
        </RadarAddEventDockChrome>
    );
});
