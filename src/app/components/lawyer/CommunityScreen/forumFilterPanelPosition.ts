export function resolveForumFilterPanelPosition(anchor: DOMRect): {
    top: number;
    left: number;
    width: number;
} {
    const viewportPadding = 8;
    const gap = 10;
    const estimatedHeight = 420;
    const width = Math.min(352, window.innerWidth - viewportPadding * 2);
    let left = anchor.right - width;
    if (left + width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - width - viewportPadding;
    }
    if (left < viewportPadding) {
        left = viewportPadding;
    }

    const belowTop = anchor.bottom + gap;
    const aboveTop = anchor.top - estimatedHeight - gap;
    const fitsBelow = belowTop + estimatedHeight <= window.innerHeight - viewportPadding;
    const fitsAbove = aboveTop >= viewportPadding;
    const top = fitsBelow
        ? belowTop
        : fitsAbove
          ? aboveTop
          : Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);

    return { top, left, width };
}
