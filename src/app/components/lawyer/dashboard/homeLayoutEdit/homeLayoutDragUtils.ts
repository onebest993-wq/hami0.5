import type { HomeWidgetId } from '@/app/services/settings/homeLayout';
import { isDockShellOrderWidget } from '@/app/services/settings/homeWidgetPlacements';

export type WidgetRectEntry = { id: HomeWidgetId; rect: DOMRect };

const ROW_TOLERANCE_PX = 20;

export function sortMainWidgetsByVisualOrder(items: WidgetRectEntry[]) {
    return [...items].sort((a, b) => {
        const rowDelta = a.rect.top - b.rect.top;
        if (Math.abs(rowDelta) > ROW_TOLERANCE_PX) return rowDelta;
        return b.rect.right - a.rect.right;
    });
}

export function sortDockShellByVisualOrder(items: WidgetRectEntry[]) {
    return [...items]
        .filter((entry) => isDockShellOrderWidget(entry.id))
        .sort((a, b) => b.rect.right - a.rect.right);
}

export function sortAllDockWidgetsByVisualOrder(items: WidgetRectEntry[]) {
    return [...items].sort((a, b) => {
        const rowDelta = a.rect.top - b.rect.top;
        if (Math.abs(rowDelta) > ROW_TOLERANCE_PX) return rowDelta;
        return b.rect.right - a.rect.right;
    });
}

function groupMainIntoRows(items: WidgetRectEntry[]) {
    const sorted = sortMainWidgetsByVisualOrder(items);
    const rows: WidgetRectEntry[][] = [];
    for (const item of sorted) {
        const row = rows.find((r) => Math.abs(r[0].rect.top - item.rect.top) < ROW_TOLERANCE_PX);
        if (row) row.push(item);
        else rows.push([item]);
    }
    for (const row of rows) {
        row.sort((a, b) => b.rect.right - a.rect.right);
    }
    return rows;
}

/** فهرس بصري في الشبكة الرئيسية */
export function computeMainVisualIndex(
    x: number,
    y: number,
    items: WidgetRectEntry[],
    excludeId?: HomeWidgetId,
) {
    const sorted = sortMainWidgetsByVisualOrder(items.filter((entry) => entry.id !== excludeId));
    if (sorted.length === 0) return 0;

    const rows = groupMainIntoRows(sorted);
    let index = 0;

    for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        const rowTop = Math.min(...row.map((i) => i.rect.top));
        const rowBottom = Math.max(...row.map((i) => i.rect.bottom));

        if (ri === 0 && y < rowTop - 16) return 0;

        if (ri > 0) {
            const prevBottom = Math.max(...rows[ri - 1].map((i) => i.rect.bottom));
            if (y > prevBottom + 2 && y < rowTop - 2) return index;
        }

        if (y >= rowTop - 16 && y <= rowBottom + 16) {
            for (let ci = 0; ci < row.length; ci++) {
                const r = row[ci].rect;
                const centerX = r.left + r.width / 2;
                if (x >= centerX) return index + ci;
            }
            return index + row.length;
        }

        index += row.length;
    }

    return sorted.length;
}

export function clampMainPointerY(
    y: number,
    dock: DOMRect | undefined,
    clearancePx = 20,
): number {
    if (!dock) return y;
    const maxY = dock.top - clearancePx;
    return y > maxY ? maxY : y;
}

/** فهرس بصري بين أيقونات الشريط (بدون شريط الملاحظة) */
function computeDockShellVisualIndex(x: number, shellItems: WidgetRectEntry[]) {
    if (shellItems.length === 0) return 0;
    for (let i = 0; i < shellItems.length; i++) {
        const r = shellItems[i].rect;
        const splitX = r.right - r.width * 0.35;
        if (x >= splitX) return i;
    }
    return shellItems.length;
}

/** فهرس placement في الدوك من إحداثيات المؤشر وترتيب الإعدادات */
export function computeDockPlacementIndex(
    x: number,
    _y: number,
    items: WidgetRectEntry[],
    placementOrder: HomeWidgetId[],
    excludeId?: HomeWidgetId,
) {
    const filtered = items.filter((entry) => entry.id !== excludeId);
    const order = placementOrder.filter((id) => id !== excludeId);
    const shell = sortDockShellByVisualOrder(filtered);
    const shellVisualIdx = computeDockShellVisualIndex(x, shell);

    if (shellVisualIdx >= shell.length) {
        const shellInOrder = order.filter((id) => isDockShellOrderWidget(id));
        if (shellInOrder.length === 0) return order.length;
        const afterId = shellInOrder[shellInOrder.length - 1];
        const pos = order.indexOf(afterId);
        return pos >= 0 ? pos + 1 : order.length;
    }

    const beforeId = shell[shellVisualIdx].id;
    const idx = order.indexOf(beforeId);
    return idx >= 0 ? idx : order.length;
}

/** تحويل فهرس بصري → فهرس placement حسب ترتيب الإعدادات */
export function visualIndexToPlacementIndex(
    zone: 'main' | 'dock',
    visualIndex: number,
    items: WidgetRectEntry[],
    placementOrder: HomeWidgetId[],
    excludeId?: HomeWidgetId,
): number {
    const filtered = items.filter((entry) => entry.id !== excludeId);
    const sorted =
        zone === 'main'
            ? sortMainWidgetsByVisualOrder(filtered)
            : sortAllDockWidgetsByVisualOrder(filtered);
    const order = placementOrder.filter((id) => id !== excludeId);

    if (visualIndex >= sorted.length) return order.length;

    const beforeId = sorted[visualIndex]?.id;
    if (!beforeId) return order.length;

    const idx = order.indexOf(beforeId);
    return idx >= 0 ? idx : order.length;
}

export function resolveMainIndicatorY(
    visualIndex: number,
    items: WidgetRectEntry[],
    excludeId?: HomeWidgetId,
): number | null {
    const sorted = sortMainWidgetsByVisualOrder(items.filter((entry) => entry.id !== excludeId));
    if (sorted.length === 0) return null;
    if (visualIndex >= sorted.length) return sorted[sorted.length - 1].rect.bottom + 6;
    return sorted[visualIndex].rect.top - 4;
}
