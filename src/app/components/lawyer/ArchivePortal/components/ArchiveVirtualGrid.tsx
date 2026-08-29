import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { shouldVirtualizeArchiveList } from '@/app/runtime/mobileRenderCore';
import { isLitePerformanceActiveFromDom } from '@/app/runtime/devicePerformanceTier';
import {
    archiveGridClassForColumnCount,
    readArchiveGridWidthGuess,
    resolveArchiveGridColumnCount,
} from '../archiveGridGeometry';

/** آخر عرض مُقاس للشبكة — يمنع عمود-واحد ثم اتساع عند أول تركيب في الجلسة. */
let lastMeasuredArchiveHostWidth = 0;

function chunkRows<T>(items: T[], columns: number): T[][] {
    if (columns <= 1) return items.map((item) => [item]);
    const rows: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
        rows.push(items.slice(i, i + columns));
    }
    return rows;
}

function gridClassForMeasured(columns: number, fallbackClassName: string): string {
    if (columns <= 1 && fallbackClassName.includes('space-y')) return fallbackClassName;
    return archiveGridClassForColumnCount(columns);
}

export type ArchiveVirtualGridProps<T> = {
    items: T[];
    estimateRowSize?: number;
    getItemKey: (item: T) => string | number;
    renderItem: (item: T) => React.ReactNode;
    className?: string;
    testId?: string;
    /** عدد الأعمدة حسب عرض الحاوية — افتراضي 1/2/3/4 */
    resolveColumns?: (width: number) => number;
    /**
     * عنصر التمرير الأب (InstantShell / Chrome overflow) —
     * مطلوب داخل overflow-y-auto؛ بدونها يُستخدم documentElement.
     */
    getScrollElement?: () => Element | null;
};

/**
 * شبكة أرشيف مُعاد تدويرها عبر scroll-parent virtualizer —
 * لا ترسم إلا الصفوف المرئية (+ overscan).
 */
export function ArchiveVirtualGrid<T>({
    items,
    estimateRowSize = 220,
    getItemKey,
    renderItem,
    className = 'grid grid-cols-1 gap-2.5',
    testId = 'archive-virtual-grid',
    resolveColumns = resolveArchiveGridColumnCount,
    getScrollElement,
}: ArchiveVirtualGridProps<T>) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(() =>
        readArchiveGridWidthGuess(lastMeasuredArchiveHostWidth),
    );

    useLayoutEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;

        const commit = () => {
            const next = host.clientWidth;
            if (next <= 0) return;
            lastMeasuredArchiveHostWidth = next;
            setContainerWidth((prev) => (prev === next ? prev : next));
        };

        commit();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(() => commit());
        observer.observe(host);
        return () => observer.disconnect();
    }, []);

    const columns = useMemo(
        () => Math.max(1, resolveColumns(containerWidth) || 1),
        [resolveColumns, containerWidth],
    );
    const rows = useMemo(() => chunkRows(items, columns), [items, columns]);
    const lite = isLitePerformanceActiveFromDom() === true;
    const virtualize = shouldVirtualizeArchiveList(items.length);
    const [overscanReady, setOverscanReady] = useState(() => !virtualize);
    useEffect(() => {
        if (!virtualize) {
            setOverscanReady(true);
            return;
        }
        setOverscanReady(false);
        let raf2 = 0;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setOverscanReady(true));
        });
        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [items.length, virtualize]);
    const overscan = lite ? (overscanReady ? 3 : 2) : overscanReady ? 6 : 2;

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => {
            const nested = getScrollElement?.();
            if (nested) return nested;
            return typeof document !== 'undefined' ? document.documentElement : null;
        },
        estimateSize: () => estimateRowSize,
        overscan,
    });

    const measuredGridClass = gridClassForMeasured(columns, className);

    return (
        <div ref={hostRef} className="w-full min-w-0" data-testid={testId}>
            {!virtualize ? (
                <div className={measuredGridClass} data-hami-virtual-list="0">
                    {items.map((item) => (
                        <React.Fragment key={getItemKey(item)}>{renderItem(item)}</React.Fragment>
                    ))}
                </div>
            ) : (
                <div
                    className="relative w-full"
                    style={{ height: `${virtualizer.getTotalSize()}px` }}
                    data-hami-virtual-list="1"
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const rowItems = rows[virtualRow.index] ?? [];
                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                ref={virtualizer.measureElement}
                                className="absolute top-0 left-0 w-full pb-2.5"
                                style={{ transform: `translate3d(0, ${virtualRow.start}px, 0)` }}
                            >
                                <div className={measuredGridClass}>
                                    {rowItems.map((item) => (
                                        <React.Fragment key={getItemKey(item)}>
                                            {renderItem(item)}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
