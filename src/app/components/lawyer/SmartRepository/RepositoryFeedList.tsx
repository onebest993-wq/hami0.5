import React from 'react';
import type { RefObject } from 'react';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import type { UniversalEntryCardProps } from './UniversalEntryCard';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { shouldVirtualizeRepositoryFeed } from './repositoryFeedVirtualLayout';
import { RepositoryFeedVirtualList } from './RepositoryFeedVirtualList';
import { RepositoryFeedProgressiveList } from './RepositoryFeedProgressiveList';

type RepositoryFeedListProps = Omit<UniversalEntryCardProps, 'item'> & {
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    scrollParentRef?: RefObject<HTMLDivElement | null>;
};

export const RepositoryFeedList = React.memo(function RepositoryFeedList({
    items,
    feedLayout,
    scrollParentRef,
    ...cardProps
}: RepositoryFeedListProps) {
    if (shouldVirtualizeRepositoryFeed(items.length)) {
        return (
            <RepositoryFeedVirtualList
                items={items}
                feedLayout={feedLayout}
                scrollParentRef={scrollParentRef}
                {...cardProps}
            />
        );
    }

    return (
        <RepositoryFeedProgressiveList
            items={items}
            feedLayout={feedLayout}
            {...cardProps}
        />
    );
});
