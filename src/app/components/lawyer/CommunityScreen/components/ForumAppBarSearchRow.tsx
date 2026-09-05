import { Suspense, useEffect, useState, type RefObject } from 'react';
import { FORUM_FILTER_LABELS } from '../forumFilters';
import {
    repositoryFilterSummary,
    repositoryHasActiveListFilters,
    type RepositorySortKey,
} from '../repositoryListFilters';
import { prefetchCommunityFilterOverlays } from '../communityOverlayPrefetch';
import { LazyForumAppBarFilterOverlays } from '../communityScreenFilterLazy';
import { ForumAppBarSearchField } from './ForumAppBarSearchField';
import { ForumAppBarFilterTriggers } from './ForumAppBarFilterTriggers';
import type { ForumSectionId } from './ForumSectionSwitch';

type ForumAppBarSearchRowProps = {
    activeSection: ForumSectionId;
    searchPlaceholder: string;
    groupsSearchQuery: string;
    onGroupsSearchQueryChange?: (value: string) => void;
    repositorySearchTerm: string;
    onRepositorySearchTermChange: (value: string) => void;
    selectedFilterIndex: number;
    onFilterSelect: (index: number) => void;
    repositorySortBy: RepositorySortKey;
    onRepositorySortChange: (value: RepositorySortKey) => void;
    repositorySelectedType: string;
    onRepositoryTypeChange: (value: string) => void;
    repositorySelectedTag: string | null;
    onRepositoryTagChange: (tag: string | null) => void;
    showForumFilterPanel: boolean;
    showRepositoryFilterPanel: boolean;
    forumFilterTriggerRef: RefObject<HTMLButtonElement | null>;
    onForumSearchOpen: () => void;
    onForumFilterToggle: () => void;
    onRepositoryFilterToggle: () => void;
    onCloseForumFilter: () => void;
    onCloseRepositoryFilter: () => void;
};

export function ForumAppBarSearchRow(props: ForumAppBarSearchRowProps) {
    const filtersOpen = props.showForumFilterPanel || props.showRepositoryFilterPanel;
    const [filterOverlaysArmed, setFilterOverlaysArmed] = useState(false);
    useEffect(() => {
        if (filtersOpen) setFilterOverlaysArmed(true);
    }, [filtersOpen]);

    const activeFilterLabel = FORUM_FILTER_LABELS[props.selectedFilterIndex] ?? FORUM_FILTER_LABELS[0];
    const hasForumFilter = props.selectedFilterIndex !== 0;
    const hasRepositoryFilter = repositoryHasActiveListFilters(
        props.repositorySelectedType,
        props.repositorySortBy,
        props.repositorySelectedTag,
    );
    const repositoryFilterHint = repositoryFilterSummary(
        props.repositorySelectedType,
        props.repositorySortBy,
        props.repositorySelectedTag,
    );

    return (
        <div className="px-3 pb-2 relative">
            <div className="flex items-center gap-2">
                <ForumAppBarSearchField
                    activeSection={props.activeSection}
                    searchPlaceholder={props.searchPlaceholder}
                    groupsSearchQuery={props.groupsSearchQuery}
                    onGroupsSearchQueryChange={props.onGroupsSearchQueryChange}
                    repositorySearchTerm={props.repositorySearchTerm}
                    onRepositorySearchTermChange={props.onRepositorySearchTermChange}
                    onForumSearchOpen={props.onForumSearchOpen}
                >
                    <ForumAppBarFilterTriggers
                        activeSection={props.activeSection}
                        hasForumFilter={hasForumFilter}
                        hasRepositoryFilter={hasRepositoryFilter}
                        activeFilterLabel={activeFilterLabel}
                        repositoryFilterHint={repositoryFilterHint}
                        showForumFilterPanel={props.showForumFilterPanel}
                        showRepositoryFilterPanel={props.showRepositoryFilterPanel}
                        forumFilterTriggerRef={props.forumFilterTriggerRef}
                        onForumFilterToggle={props.onForumFilterToggle}
                        onRepositoryFilterToggle={props.onRepositoryFilterToggle}
                        onPrefetch={prefetchCommunityFilterOverlays}
                    />
                </ForumAppBarSearchField>
            </div>
            {filtersOpen || filterOverlaysArmed ? (
                <Suspense fallback={null}>
                    <LazyForumAppBarFilterOverlays
                        showForumFilterPanel={props.showForumFilterPanel}
                        showRepositoryFilterPanel={props.showRepositoryFilterPanel}
                        selectedFilterIndex={props.selectedFilterIndex}
                        onFilterSelect={props.onFilterSelect}
                        onCloseForumFilter={props.onCloseForumFilter}
                        forumFilterTriggerRef={props.forumFilterTriggerRef}
                        repositorySortBy={props.repositorySortBy}
                        repositorySelectedType={props.repositorySelectedType}
                        repositorySelectedTag={props.repositorySelectedTag}
                        onRepositorySortChange={props.onRepositorySortChange}
                        onRepositoryTypeChange={props.onRepositoryTypeChange}
                        onRepositoryTagChange={props.onRepositoryTagChange}
                        onCloseRepositoryFilter={props.onCloseRepositoryFilter}
                    />
                </Suspense>
            ) : null}
        </div>
    );
}
