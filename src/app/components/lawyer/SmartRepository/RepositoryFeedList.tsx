import React from 'react';
import type { RefObject } from 'react';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import type { UniversalEntryCardProps } from './UniversalEntryCard';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { RepositoryFeedVirtualList } from './RepositoryFeedVirtualList';

type RepositoryFeedListProps = Omit<UniversalEntryCardProps, 'item'> & {
    items: RepositoryFeedItem[];
    feedLayout: RepositoryFeedLayoutId;
    scrollParentRef?: RefObject<HTMLDivElement | null>;
    focusNoteId?: string;
};

/** مسار واحد: تمرير افتراضي لكل الأحجام — بلا زر «عرض المزيد» وبلا قائمة تدريجية موازية */
export const RepositoryFeedList = React.memo(function RepositoryFeedList({
    items,
    feedLayout,
    scrollParentRef,
    focusNoteId,
    ...cardProps
}: RepositoryFeedListProps) {
    return (
        <RepositoryFeedVirtualList
            items={items}
            feedLayout={feedLayout}
            scrollParentRef={scrollParentRef}
            focusNoteId={focusNoteId}
            {...cardProps}
        />
    );
});
