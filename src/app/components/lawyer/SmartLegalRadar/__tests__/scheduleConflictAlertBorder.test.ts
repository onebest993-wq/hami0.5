import { describe, expect, it } from 'vitest';
import { resolveScheduleConflictAlertBorderClass } from '@/app/components/lawyer/SmartLegalRadar/scheduleConflictAlertBorder';
import {
    RADAR_ALERT_BORDER_LOCATION,
    RADAR_ALERT_BORDER_OVERLOAD,
    RADAR_ALERT_BORDER_TRAVEL,
    RADAR_ALERT_BORDER_DEFAULT,
} from '@/app/components/lawyer/SmartLegalRadar/radarTheme';
import type { CrossSectionConflictResult } from '@/app/services/calendar/scheduleConflictDetector';

function stubConflict(
    partial: Partial<CrossSectionConflictResult>,
): CrossSectionConflictResult {
    return {
        items: [],
        totalCount: 0,
        sourceCounts: { HEARING: 0, TRANSACTION: 0, TASK: 0 },
        isOverloaded: false,
        hasLocationMismatch: false,
        hasTravelConflict: false,
        distinctLocations: [],
        travelConflict: null,
        warningMessage: null,
        travelWarning: null,
        hasConflict: true,
        ...partial,
    };
}

describe('resolveScheduleConflictAlertBorderClass', () => {
    it('إثقال فقط — إطار ذهبي', () => {
        expect(
            resolveScheduleConflictAlertBorderClass(
                stubConflict({ isOverloaded: true }),
            ),
        ).toBe(RADAR_ALERT_BORDER_OVERLOAD);
    });

    it('تعارض مواقع — إطار ذهبي خفيف', () => {
        expect(
            resolveScheduleConflictAlertBorderClass(
                stubConflict({ hasLocationMismatch: true }),
            ),
        ).toBe(RADAR_ALERT_BORDER_LOCATION);
    });

    it('تعارض تنقّل — إطار وردي (أعلى خطورة)', () => {
        expect(
            resolveScheduleConflictAlertBorderClass(
                stubConflict({
                    hasTravelConflict: true,
                    hasLocationMismatch: true,
                    isOverloaded: true,
                }),
            ),
        ).toBe(RADAR_ALERT_BORDER_TRAVEL);
    });

    it('افتراضي عند غياب نوع محدد', () => {
        expect(resolveScheduleConflictAlertBorderClass(stubConflict({}))).toBe(
            RADAR_ALERT_BORDER_DEFAULT,
        );
    });
});
