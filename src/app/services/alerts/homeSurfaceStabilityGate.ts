/**
 * بوابة ثبات سطح الرئيسية بعد الكشف — CLS + إزاحة هندسية.
 * القياس في E2E؛ التقييم هنا حتى يبقى الحدّ قابلاً للاختبار بلا متصفح.
 */

export type HomeSurfaceRectSample = {
    present: boolean;
    x: number;
    y: number;
    w: number;
    h: number;
};

export type HomeSurfaceLayoutShiftSample = {
    value: number;
    startTime: number;
    hadRecentInput: boolean;
    /** إن وُجدت مصادر: هل لمست الشبكة/البطاقة/الهيدر */
    affectsHomeSurface: boolean;
};

export type HomeSurfaceFrameSample = {
    t: number;
    hub: HomeSurfaceRectSample;
    grid: HomeSurfaceRectSample;
    header: HomeSurfaceRectSample;
};

export type HomeSurfaceStabilityProbe = {
    firstHubVisibleAt: number | null;
    layoutShifts: HomeSurfaceLayoutShiftSample[];
    frames: HomeSurfaceFrameSample[];
};

export type HomeSurfaceStabilityMetrics = {
    postRevealCls: number;
    hubShiftPx: number;
    gridShiftPx: number;
    headerShiftPx: number;
    framesCaptured: number;
};

export type HomeSurfaceStabilityVerdict = {
    ok: boolean;
    failures: string[];
    metrics: HomeSurfaceStabilityMetrics;
};

/** Google «جيّد» < 0.1 — بعد الكشف نطلب أضيق لأن الرعشة هنا مرئية */
export const HOME_SURFACE_POST_REVEAL_CLS_MAX = 0.05;
/** إزاحة من أول إطار ظاهر — يطابق visual-stability-audit */
export const HOME_SURFACE_MAX_RECT_SHIFT_PX = 4;

export function scorePostRevealHomeCls(
    shifts: HomeSurfaceLayoutShiftSample[],
    firstHubVisibleAt: number | null,
): number {
    if (firstHubVisibleAt == null) return 0;
    return shifts
        .filter(
            (shift) =>
                !shift.hadRecentInput &&
                shift.affectsHomeSurface &&
                shift.startTime >= firstHubVisibleAt,
        )
        .reduce((sum, shift) => sum + shift.value, 0);
}

export function maxRectShiftFromAnchor(rects: HomeSurfaceRectSample[]): number {
    const anchor = rects.find((rect) => rect.present && rect.w > 0 && rect.h > 0);
    if (!anchor) return 0;
    let max = 0;
    for (const rect of rects) {
        if (!rect.present || rect.w <= 0 || rect.h <= 0) continue;
        max = Math.max(
            max,
            Math.abs(rect.x - anchor.x),
            Math.abs(rect.y - anchor.y),
            Math.abs(rect.w - anchor.w),
            Math.abs(rect.h - anchor.h),
        );
    }
    return max;
}

export function evaluateHomeSurfaceStability(
    probe: HomeSurfaceStabilityProbe,
): HomeSurfaceStabilityVerdict {
    const failures: string[] = [];
    if (probe.firstHubVisibleAt == null) {
        failures.push('hub never became visible');
    }

    const postRevealCls = scorePostRevealHomeCls(probe.layoutShifts, probe.firstHubVisibleAt);
    const hubShiftPx = maxRectShiftFromAnchor(probe.frames.map((frame) => frame.hub));
    const gridShiftPx = maxRectShiftFromAnchor(probe.frames.map((frame) => frame.grid));
    const headerShiftPx = maxRectShiftFromAnchor(probe.frames.map((frame) => frame.header));

    if (probe.firstHubVisibleAt != null && postRevealCls > HOME_SURFACE_POST_REVEAL_CLS_MAX) {
        failures.push(
            `postRevealCls=${postRevealCls.toFixed(4)} > ${HOME_SURFACE_POST_REVEAL_CLS_MAX}`,
        );
    }
    if (hubShiftPx > HOME_SURFACE_MAX_RECT_SHIFT_PX) {
        failures.push(`hubShiftPx=${hubShiftPx.toFixed(2)} > ${HOME_SURFACE_MAX_RECT_SHIFT_PX}`);
    }
    if (gridShiftPx > HOME_SURFACE_MAX_RECT_SHIFT_PX) {
        failures.push(`gridShiftPx=${gridShiftPx.toFixed(2)} > ${HOME_SURFACE_MAX_RECT_SHIFT_PX}`);
    }
    if (headerShiftPx > HOME_SURFACE_MAX_RECT_SHIFT_PX) {
        failures.push(
            `headerShiftPx=${headerShiftPx.toFixed(2)} > ${HOME_SURFACE_MAX_RECT_SHIFT_PX}`,
        );
    }

    return {
        ok: failures.length === 0,
        failures,
        metrics: {
            postRevealCls,
            hubShiftPx,
            gridShiftPx,
            headerShiftPx,
            framesCaptured: probe.frames.length,
        },
    };
}
