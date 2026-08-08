import React from 'react';
import { RADAR_FORM_OVERLAY, RADAR_FORM_PANEL, RADAR_SKELETON } from './radarTheme';

/** ستارة فورية أثناء تحميل نموذج الموعد */
export function EventFormInstantShell(): React.ReactElement {
    return (
        <div
            className={RADAR_FORM_OVERLAY}
            data-testid="radar-event-form-loading"
            aria-busy="true"
            aria-label="إضافة موعد"
        >
            <div className={RADAR_FORM_PANEL}>
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#E2E8F0]">
                    <div className={`h-6 w-36 rounded-lg ${RADAR_SKELETON}`} />
                    <div className={`h-8 w-8 rounded-lg ${RADAR_SKELETON}`} />
                </div>
                <div className="space-y-4">
                    <div className={`h-10 rounded-xl ${RADAR_SKELETON}`} />
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`h-10 rounded-xl ${RADAR_SKELETON}`} />
                        <div className={`h-10 rounded-xl ${RADAR_SKELETON}`} />
                    </div>
                    <div className={`h-10 rounded-xl ${RADAR_SKELETON}`} />
                </div>
            </div>
        </div>
    );
}
