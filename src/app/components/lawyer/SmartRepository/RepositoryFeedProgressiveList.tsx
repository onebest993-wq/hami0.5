import React, { useCallback, useEffect, useState } from 'react';
import { repositoryFeedItemKey, type RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import { REPO_FEED_ITEM } from './smartRepositoryTheme';
import { UniversalEntryCard, type UniversalEntryCardProps } from './UniversalEntryCard';
import { REPOSITORY_FEED_EXPAND_THRESHOLD } from './repositoryFeedConstants';

const PROGRESSIVE_BATCH_SIZE = 24;

type RepositoryFeedProgressiveListProps = Omit<UniversalEntryCardProps, 'item'> & {
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
};

export const RepositoryFeedProgressiveList = React.memo(function RepositoryFeedProgressiveList({
    items,
    feedLayout,
    ...cardProps
}: RepositoryFeedProgressiveListProps) {
    const [showAll, setShowAll] = useState(false);
    const [renderCount, setRenderCount] = useState(REPOSITORY_FEED_EXPAND_THRESHOLD);

    useEffect(() => {
        setShowAll(false);
        setRenderCount(REPOSITORY_FEED_EXPAND_THRESHOLD);
    }, [items]);

    const needsExpand = items.length > REPOSITORY_FEED_EXPAND_THRESHOLD;
    const cap = needsExpand && !showAll ? REPOSITORY_FEED_EXPAND_THRESHOLD : items.length;
    const visibleItems = items.slice(0, Math.min(renderCount, cap));
    const hiddenCount = needsExpand && !showAll ? items.length - REPOSITORY_FEED_EXPAND_THRESHOLD : 0;

    const expandAll = useCallback(() => {
        setShowAll(true);
        setRenderCount(REPOSITORY_FEED_EXPAND_THRESHOLD);
    }, []);

    useEffect(() => {
        if (!showAll || items.length <= REPOSITORY_FEED_EXPAND_THRESHOLD) return undefined;

        let cancelled = false;
        let count = REPOSITORY_FEED_EXPAND_THRESHOLD;
        const step = () => {
            if (cancelled) return;
            count = Math.min(count + PROGRESSIVE_BATCH_SIZE, items.length);
            setRenderCount(count);
            if (count < items.length) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
        return () => {
            cancelled = true;
        };
    }, [showAll, items.length]);

    return (
        <>
            {visibleItems.map((item) => (
                <div
                    key={repositoryFeedItemKey(item)}
                    className={REPO_FEED_ITEM}
                >
                    <UniversalEntryCard item={item} feedLayout={feedLayout} {...cardProps} />
                </div>
            ))}
            {hiddenCount > 0 ? (
                <button
                    type="button"
                    data-testid="repository-show-all-items"
                    onClick={expandAll}
                    className="col-span-full w-full py-3 rounded-xl border border-[#E6C673]/18 bg-white/[0.03] text-white/70 text-sm font-bold hover:bg-white/[0.06] transition-colors touch-manipulation min-h-[44px]"
                >
                    عرض {hiddenCount} بطاقة إضافية
                </button>
            ) : null}
        </>
    );
});
