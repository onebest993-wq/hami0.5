import React from 'react';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import type { UniversalEntryCardProps } from './UniversalEntryCard';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { shouldVirtualizeRepositoryFeed } from './repositoryFeedVirtualLayout';
import { RepositoryFeedVirtualList } from './RepositoryFeedVirtualList';
import { RepositoryFeedProgressiveList } from './RepositoryFeedProgressiveList';

type RepositoryFeedListProps = Omit<UniversalEntryCardProps, 'item'> & {
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    itemLayoutClass?: string;
};

export const RepositoryFeedList = React.memo(function RepositoryFeedList({
    items,
    feedLayout,
    itemLayoutClass = '',
    ...cardProps
}: RepositoryFeedListProps) {
    if (shouldVirtualizeRepositoryFeed(items.length)) {
        return (
            <RepositoryFeedVirtualList
                items={items}
                feedLayout={feedLayout}
                itemLayoutClass={itemLayoutClass}
                {...cardProps}
            />
        );
    }

    return (
        <RepositoryFeedProgressiveList
            items={items}
            feedLayout={feedLayout}
            itemLayoutClass={itemLayoutClass}
            {...cardProps}
        />
    );
});
