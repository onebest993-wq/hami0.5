import type { CrossSectionConflictResult } from '@/app/services/calendar/scheduleConflictDetector';
import {
    RADAR_ALERT_BORDER_LOCATION,
    RADAR_ALERT_BORDER_OVERLOAD,
    RADAR_ALERT_BORDER_TRAVEL,
    RADAR_ALERT_BORDER_DEFAULT,
} from './radarTheme';

/** إطار خفيف — أعلى خطورة أولاً: تنقّل → مواقع → إثقال */
export function resolveScheduleConflictAlertBorderClass(
    conflict: CrossSectionConflictResult,
): string {
    if (conflict.hasTravelConflict) return RADAR_ALERT_BORDER_TRAVEL;
    if (conflict.hasLocationMismatch) return RADAR_ALERT_BORDER_LOCATION;
    if (conflict.isOverloaded) return RADAR_ALERT_BORDER_OVERLOAD;
    return RADAR_ALERT_BORDER_DEFAULT;
}
