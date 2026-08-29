import React, { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { repositoryFeedItemKey, type RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import { REPO_FEED_ITEM } from './smartRepositoryTheme';
import { UniversalEntryCard, type UniversalEntryCardProps } from './UniversalEntryCard';
import { useRepositoryFeedColumnCount } from './hooks/useRepositoryFeedColumnCount';
import {
    chunkRepositoryFeedItems,
    estimateRepositoryFeedRowSize,
    repositoryFeedRowGridClass,
} from './repositoryFeedVirtualLayout';

type RepositoryFeedCardProps = Omit<UniversalEntryCardProps, 'item' | 'feedLayout'>;
type RepositoryFeedVirtualListProps = RepositoryFeedCardProps & {
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    /** تمرير طبقة المستودع — يتجنّب overflow متداخلاً داخل REPO_BODY */
    scrollParentRef?: RefObject<HTMLDivElement | null>;
};

const NESTED_SCROLL_CLASS =
    'max-h-[min(70dvh,640px)] overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide';

function RepositoryFeedVirtualRow({
    rowItems,
    columnCount,
    feedLayout,
    cardProps,
}: {
    rowItems: RepositoryFeedItem[];
    columnCount: number;
    feedLayout: RepositoryFeedLayoutId;
    cardProps: RepositoryFeedCardProps;
}) {
    const rowClass =
        columnCount > 1 ? repositoryFeedRowGridClass(columnCount) : 'flex flex-col gap-2.5 sm:gap-3';

    return (
        <div className={rowClass}>
            {rowItems.map((item) => (
                <div
                    key={repositoryFeedItemKey(item)}
                    className={REPO_FEED_ITEM}
                >
                    <UniversalEntryCard item={item} feedLayout={feedLayout} {...cardProps} />
                </div>
            ))}
        </div>
    );
}

export const RepositoryFeedVirtualList = React.memo(function RepositoryFeedVirtualList({
    items,
    feedLayout,
    scrollParentRef,
    ...cardProps
}: RepositoryFeedVirtualListProps) {
    const localScrollRef = useRef<HTMLDivElement>(null);
    const scrollRef = scrollParentRef ?? localScrollRef;
    const nestedScroll = !scrollParentRef;
    const columnCount = useRepositoryFeedColumnCount(scrollRef, feedLayout);
    const firstItemKey = items[0] ? repositoryFeedItemKey(items[0]) : '';

    useEffect(() => {
        if (!firstItemKey) return;
        const root = scrollRef.current;
        if (root) root.scrollTop = 0;
    }, [firstItemKey, scrollRef]);

    const rows = useMemo(
        () => chunkRepositoryFeedItems(items, columnCount),
        [columnCount, items],
    );

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => estimateRepositoryFeedRowSize(feedLayout),
        overscan: 2,
        measureElement: (el) => (el as HTMLElement).offsetHeight,
    });

    return (
        <div
            ref={nestedScroll ? localScrollRef : undefined}
            className={nestedScroll ? NESTED_SCROLL_CLASS : undefined}
            data-testid="repository-feed-virtual-scroll"
            aria-busy={false}
        >
            <div
                className="relative w-full"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const rowItems = rows[virtualRow.index];
                    if (!rowItems?.length) return null;
                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            className="absolute top-0 left-0 w-full pb-2.5 sm:pb-3"
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                            <RepositoryFeedVirtualRow
                                rowItems={rowItems}
                                columnCount={columnCount}
                                feedLayout={feedLayout}
                                cardProps={cardProps}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
