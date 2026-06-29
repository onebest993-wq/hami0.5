import React, { useMemo, useRef } from 'react';
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
    itemLayoutClass?: string;
};

function RepositoryFeedVirtualRow({
    rowItems,
    columnCount,
    feedLayout,
    itemLayoutClass,
    cardProps,
}: {
    rowItems: RepositoryFeedItem[];
    columnCount: number;
    feedLayout: RepositoryFeedLayoutId;
    itemLayoutClass: string;
    cardProps: RepositoryFeedCardProps;
}) {
    const rowClass =
        columnCount > 1 ? repositoryFeedRowGridClass(columnCount) : 'flex flex-col gap-2.5 sm:gap-3';

    return (
        <div className={rowClass}>
            {rowItems.map((item) => (
                <div
                    key={repositoryFeedItemKey(item)}
                    className={`${REPO_FEED_ITEM} ${itemLayoutClass}`.trim()}
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
    itemLayoutClass = '',
    ...cardProps
}: RepositoryFeedVirtualListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const columnCount = useRepositoryFeedColumnCount(scrollRef, feedLayout);

    const rows = useMemo(
        () => chunkRepositoryFeedItems(items, columnCount),
        [columnCount, items],
    );

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => estimateRepositoryFeedRowSize(feedLayout),
        overscan: 4,
        measureElement: (el) => el.getBoundingClientRect().height,
    });

    return (
        <div
            ref={scrollRef}
            className="max-h-[min(70dvh,640px)] overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide"
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
                                itemLayoutClass={itemLayoutClass}
                                cardProps={cardProps}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
