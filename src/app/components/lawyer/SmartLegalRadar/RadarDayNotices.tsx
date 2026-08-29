import React from 'react';
import { ScheduleConflictAlert } from './ScheduleConflictAlert';
import { RADAR_TEXT_MUTED } from './radarTheme';
import type { CrossSectionConflictResult } from '@/app/services/calendar/scheduleConflictDetector';

type RadarDayNoticesProps = {
    scheduleConflict?: CrossSectionConflictResult | null;
    conflictMessage: string | null;
    dayBriefing?: string;
    hasEvents: boolean;
};

export const RadarDayNotices = React.memo(function RadarDayNotices({
    scheduleConflict = null,
    conflictMessage,
    dayBriefing,
    hasEvents,
}: RadarDayNoticesProps) {
    return (
        <>
            {scheduleConflict?.hasConflict ? (
                <ScheduleConflictAlert conflict={scheduleConflict} />
            ) : null}

            {conflictMessage ? (
                <div className="rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/8 text-[#F4F4F5] text-sm p-3 text-right">
                    <span className="text-[#F4F4F5]/85">{conflictMessage}</span>
                </div>
            ) : null}

            {dayBriefing && hasEvents ? (
                <p
                    className={`px-0.5 py-1 text-[12px] leading-relaxed ${RADAR_TEXT_MUTED}`}
                    data-testid="radar-day-briefing"
                >
                    {dayBriefing}
                </p>
            ) : null}
        </>
    );
});
