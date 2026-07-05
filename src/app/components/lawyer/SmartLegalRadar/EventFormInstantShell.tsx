import React from 'react';
import { RADAR_FORM_OVERLAY, RADAR_GLASS_PANEL } from './radarTheme';

/** ستارة فورية أثناء تحميل نموذج الموعد */
export function EventFormInstantShell(): React.ReactElement {
    return (
        <div
            className={RADAR_FORM_OVERLAY}
            data-testid="radar-event-form-loading"
            aria-busy="true"
            aria-label="إضافة موعد"
        >
            <div
                className={`w-full sm:max-w-lg ${RADAR_GLASS_PANEL} rounded-t-2xl sm:rounded-2xl p-5 border-t sm:border border-[#F5EDE0]/12`}
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="h-6 w-36 rounded-lg bg-[#F5EDE0]/[0.06] animate-pulse" />
                    <div className="h-8 w-8 rounded-lg bg-[#F5EDE0]/[0.06] animate-pulse" />
                </div>
                <div className="space-y-4">
                    <div className="h-10 rounded-xl bg-[#F5EDE0]/[0.05] animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-10 rounded-xl bg-[#F5EDE0]/[0.05] animate-pulse" />
                        <div className="h-10 rounded-xl bg-[#F5EDE0]/[0.05] animate-pulse" />
                    </div>
                    <div className="h-10 rounded-xl bg-[#F5EDE0]/[0.05] animate-pulse" />
                </div>
            </div>
        </div>
    );
}
