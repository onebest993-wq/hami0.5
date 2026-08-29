import React from 'react';
import type { CrossSectionConflictResult } from '@/app/services/calendar/scheduleConflictDetector';
import {
    RADAR_ALERT_MUTED,
    RADAR_ALERT_PANEL_BASE,
    RADAR_ALERT_TEXT,
} from './radarTheme';
import { resolveScheduleConflictAlertBorderClass } from './scheduleConflictAlertBorder';

type ScheduleConflictAlertProps = {
    conflict: CrossSectionConflictResult;
};

function sourceSummary(conflict: CrossSectionConflictResult): string | null {
    const parts: string[] = [];
    if (conflict.sourceCounts.HEARING > 0) {
        parts.push(`${conflict.sourceCounts.HEARING} جلسات/مواعيد`);
    }
    if (conflict.sourceCounts.TRANSACTION > 0) {
        parts.push(`${conflict.sourceCounts.TRANSACTION} معاملات`);
    }
    if (conflict.sourceCounts.TASK > 0) {
        parts.push(`${conflict.sourceCounts.TASK} مهام`);
    }
    return parts.length ? parts.join(' · ') : null;
}

/**
 * ملخص تنبيه فقط عند الإثقال/تعارض المواقع أو التنقّل — بلا اقتراحات أو أزرار.
 */
export const ScheduleConflictAlert = React.memo(function ScheduleConflictAlert({
    conflict,
}: ScheduleConflictAlertProps) {
    if (!conflict.hasConflict) return null;

    const primary = conflict.warningMessage || conflict.travelWarning;
    if (!primary) return null;

    const showTravelSecondary = Boolean(
        conflict.warningMessage && conflict.travelWarning && conflict.hasTravelConflict,
    );
    const summary = sourceSummary(conflict);
    const borderClass = resolveScheduleConflictAlertBorderClass(conflict);

    return (
        <div
            className={`${RADAR_ALERT_PANEL_BASE} ${borderClass}`}
            role="alert"
            data-testid="schedule-conflict-alert"
            data-overloaded={conflict.isOverloaded ? '1' : '0'}
            data-location-mismatch={conflict.hasLocationMismatch ? '1' : '0'}
            data-travel-conflict={conflict.hasTravelConflict ? '1' : '0'}
        >
            <div className="min-w-0 space-y-1.5 text-right">
                <p className={`text-sm leading-relaxed ${RADAR_ALERT_TEXT}`}>{primary}</p>
                {showTravelSecondary ? (
                    <p className={`text-[11px] leading-relaxed ${RADAR_ALERT_MUTED}`}>
                        {conflict.travelWarning}
                    </p>
                ) : null}
                <p className="text-[11px] hami-radar-text-secondary">
                    إجمالي البنود:{' '}
                    <span className="font-semibold hami-radar-text-primary">{conflict.totalCount}</span>
                    {summary ? (
                        <span className="hami-radar-text-secondary"> — {summary}</span>
                    ) : null}
                </p>
            </div>
        </div>
    );
});
