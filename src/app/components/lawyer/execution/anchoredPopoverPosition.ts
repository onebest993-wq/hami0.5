/** فوق نوافذ التنفيذ والمودالات ذات z-[100] */
export const BADGE_POPOVER_Z_INDEX = 25010;

export type FixedPopoverLayout = {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
};

/**
 * يثبّت popover بـ position:fixed داخل النافذة (RTL: محاذاة يمين الزر).
 */
export function computeFixedPopoverLayout(
    anchor: DOMRect,
    options: {
        preferredWidth: number;
        estimatedHeight?: number;
        gap?: number;
        margin?: number;
    }
): FixedPopoverLayout {
    const margin = options.margin ?? 8;
    const gap = options.gap ?? 6;
    const estHeight = options.estimatedHeight ?? 260;
    const width = Math.min(options.preferredWidth, window.innerWidth - margin * 2);

    let left = anchor.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    const belowTop = anchor.bottom + gap;
    const aboveTop = anchor.top - gap - estHeight;
    const spaceBelow = window.innerHeight - margin - belowTop;
    const spaceAbove = anchor.top - gap - margin;

    let top = belowTop;
    if (spaceBelow < estHeight && spaceAbove > spaceBelow) {
        top = Math.max(margin, aboveTop);
    } else if (spaceBelow < estHeight) {
        top = Math.max(margin, window.innerHeight - margin - estHeight);
    }

    const maxHeight = Math.max(96, Math.min(estHeight, window.innerHeight - top - margin));
    return { top, left, width, maxHeight };
}

export function refinePopoverLayoutWithMeasuredHeight(
    layout: FixedPopoverLayout,
    anchor: DOMRect,
    measuredHeight: number,
    gap = 6,
    margin = 8
): FixedPopoverLayout {
    const height = Math.min(measuredHeight, layout.maxHeight);
    const belowTop = anchor.bottom + gap;
    const aboveTop = anchor.top - gap - height;
    const fitsBelow = belowTop + height <= window.innerHeight - margin;
    const fitsAbove = aboveTop >= margin;

    let top = layout.top;
    if (!fitsBelow && fitsAbove) top = aboveTop;
    else if (!fitsBelow) top = Math.max(margin, window.innerHeight - margin - height);

    const maxHeight = Math.max(96, window.innerHeight - top - margin);
    return { ...layout, top, maxHeight };
}
