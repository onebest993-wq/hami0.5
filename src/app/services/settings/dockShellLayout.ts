import type { HomeWidgetId } from './homeWidgetPlacements';
import { dockShellLabel } from './homeBlockLabels';

export type DockShellMetrics = {
    itemCount: number;
    buttonBoxPx: number;
    iconStrokePx: number;
    labelPx: number;
    rowMinHeightPx: number;
    /** حشوة عمودية للحاوية (pt + pb) بالبكسل */
    shellVerticalPaddingPx: number;
    gapRem: number;
    shellPaddingClass: string;
    showLabels: boolean;
    iconRadiusRem: number;
};

/** أبعاد متناسقة حسب عدد أيقونات الشريط */
export function resolveDockShellMetrics(itemCount: number): DockShellMetrics {
    const n = Math.max(1, itemCount);

    if (n <= 3) {
        return {
            itemCount: n,
            buttonBoxPx: 46,
            iconStrokePx: 19,
            labelPx: 9.5,
            rowMinHeightPx: 76,
            shellVerticalPaddingPx: 26,
            gapRem: 0.625,
            shellPaddingClass: 'px-3 pt-3 pb-3.5',
            showLabels: true,
            iconRadiusRem: 1.15,
        };
    }
    if (n === 4) {
        return {
            itemCount: n,
            buttonBoxPx: 40,
            iconStrokePx: 17,
            labelPx: 9,
            rowMinHeightPx: 84,
            shellVerticalPaddingPx: 26,
            gapRem: 0.375,
            shellPaddingClass: 'px-2 pt-2.5 pb-4',
            showLabels: true,
            iconRadiusRem: 1,
        };
    }
    if (n === 5) {
        return {
            itemCount: n,
            buttonBoxPx: 38,
            iconStrokePx: 17,
            labelPx: 8.5,
            rowMinHeightPx: 74,
            shellVerticalPaddingPx: 24,
            gapRem: 0.375,
            shellPaddingClass: 'px-2 pt-2.5 pb-3.5',
            showLabels: true,
            iconRadiusRem: 0.95,
        };
    }
    return {
        itemCount: n,
        buttonBoxPx: 34,
        iconStrokePx: 15,
        labelPx: 8,
        rowMinHeightPx: 70,
        shellVerticalPaddingPx: 22,
        gapRem: 0.25,
        shellPaddingClass: 'px-1.5 pt-2 pb-3.5',
        showLabels: n <= 6,
        iconRadiusRem: 0.875,
    };
}

/** تكبير متناسب لأيقونات الدوك على التابلت */
export function scaleDockShellMetrics(metrics: DockShellMetrics, scale: number): DockShellMetrics {
    if (scale <= 1 || !Number.isFinite(scale)) return metrics;
    return {
        ...metrics,
        buttonBoxPx: Math.round(metrics.buttonBoxPx * scale),
        iconStrokePx: Math.round(metrics.iconStrokePx * scale),
        labelPx: Math.round(metrics.labelPx * scale * 10) / 10,
        rowMinHeightPx: Math.round(metrics.rowMinHeightPx * scale),
        shellVerticalPaddingPx: Math.round(metrics.shellVerticalPaddingPx * scale),
        gapRem: Math.round(metrics.gapRem * scale * 1000) / 1000,
        iconRadiusRem: Math.round(metrics.iconRadiusRem * scale * 100) / 100,
    };
}

export { dockShellLabel };
