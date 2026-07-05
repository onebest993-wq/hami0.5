import React from 'react';
import { RADAR_CALENDAR_SHELL } from './radarTheme';

/** شبكة فورية أثناء تحميل التقويم الكامل */
export function CalendarGridInstantShell(): React.ReactElement {
    return (
        <div
            className={`${RADAR_CALENDAR_SHELL} mb-6 min-h-[280px]`}
            data-testid="radar-calendar-grid-loading"
            aria-busy="true"
            aria-label="التقويم الكامل"
        >
            <div className="relative p-4 sm:p-5 space-y-4">
                <div className="h-5 w-40 mx-auto rounded bg-[#F5EDE0]/[0.06] animate-pulse" />
                <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }, (_, i) => (
                        <div
                            key={i}
                            className="aspect-square rounded-lg bg-[#F5EDE0]/[0.04] animate-pulse"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
