import React, { useEffect, useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { shouldVirtualizeArchiveList } from '@/app/runtime/mobileRenderCore';
import { isLitePerformanceActiveFromDom } from '@/app/runtime/devicePerformanceTier';

function defaultResolveColumnCount(width: number): number {
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
}

function chunkRows<T>(items: T[], columns: number): T[][] {
    if (columns <= 1) return items.map((item) => [item]);
    const rows: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
        rows.push(items.slice(i, i + columns));
    }
    return rows;
}

function rowGridClassForColumns(columns: number): string {
    if (columns >= 4) {
        return 'grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
    if (columns >= 3) {
        return 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5';
    }
    if (columns === 2) {
        return 'grid grid-cols-1 gap-4 md:grid-cols-2';
    }
    return 'grid grid-cols-1 gap-4';
}

export type ArchiveVirtualGridProps<T> = {
    items: T[];
    estimateRowSize?: number;
    getItemKey: (item: T) => string | number;
    renderItem: (item: T) => React.ReactNode;
    className?: string;
    testId?: string;
    /** عدد الأعمدة حسب عرض الشاشة — افتراضي 1/2/3/4 */
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
    className = 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 lg:grid-cols-3 xl:grid-cols-4',
    testId = 'archive-virtual-grid',
    resolveColumns = defaultResolveColumnCount,
    getScrollElement,
}: ArchiveVirtualGridProps<T>) {
    const [viewportWidth, setViewportWidth] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth : 1024,
    );
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', onResize, { passive: true });
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const columns = useMemo(
        () => Math.max(1, resolveColumns(viewportWidth) || 1),
        [resolveColumns, viewportWidth],
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

    if (!shouldVirtualizeArchiveList(items.length)) {
        return (
            <div className={className} data-testid={testId} data-hami-virtual-list="0">
                {items.map((item) => (
                    <React.Fragment key={getItemKey(item)}>{renderItem(item)}</React.Fragment>
                ))}
            </div>
        );
    }

    const rowGridClass = rowGridClassForColumns(columns);

    return (
        <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
            data-testid={testId}
            data-hami-virtual-list="1"
        >
            {virtualizer.getVirtualItems().map((virtualRow) => {
                const rowItems = rows[virtualRow.index] ?? [];
                return (
                    <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        className="absolute top-0 left-0 w-full pb-4"
                        style={{ transform: `translate3d(0, ${virtualRow.start}px, 0)` }}
                    >
                        <div className={rowGridClass}>
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
    );
}
