import type { DockShellMetrics } from './dockShellLayout';

export type DockChromeZoneVisibility = {
    shellVisible: boolean;
};

/** فراغ عمودي بين مناطق الشريط السفلي — حالياً ملاصق */
export function resolveDockChromeStackGapPx(_visibility: DockChromeZoneVisibility): number {
    return 0;
}

/** حشوة سفلية لعمود التدفق */
export const DOCK_FLOW_END_PAD_PX = 12;

const SCROLL_PAD_BUFFER_PX = 18;
/** حدود الحاوية + فجوة بصرية صغيرة تحت آخر بطاقة */
export const DOCK_SHELL_CHROME_EXTRA_PX = 4;

export type DockChromeOccupancyInput = {
    visibility: DockChromeZoneVisibility;
    shellMetrics: Pick<DockShellMetrics, 'rowMinHeightPx' | 'shellVerticalPaddingPx'>;
    stackGapPx: number;
    chromeLiftPx: number;
    stickyTopPadPx?: number;
};

/** تقدير ارتفاع الشريط السفلي الثابت لضبط scroll-padding ديناميكياً */
export function estimateDockChromeOccupiedPx(input: DockChromeOccupancyInput): number {
    const stickyTop = input.stickyTopPadPx ?? 0;
    let total = stickyTop + DOCK_FLOW_END_PAD_PX;

    if (input.visibility.shellVisible) {
        total += input.shellMetrics.rowMinHeightPx + input.shellMetrics.shellVerticalPaddingPx;
        total += DOCK_SHELL_CHROME_EXTRA_PX;
    }

    total += Math.max(0, input.chromeLiftPx);

    return Math.ceil(total);
}

export function resolveDockChromeScrollPadPx(occupiedPx: number, bufferPx = SCROLL_PAD_BUFFER_PX): number {
    return occupiedPx + bufferPx;
}
