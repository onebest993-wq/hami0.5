import type { ReactNode } from 'react';
import { Search } from '@/app/components/ui/icons/Search';
import { prefetchCommunitySearchOverlay } from '../communityOverlayPrefetch';
import { FORUM_REPO_SEARCH_BAR } from '../forumPlumTheme';
import type { ForumSectionId } from './ForumSectionSwitch';

type ForumAppBarSearchFieldProps = {
    activeSection: ForumSectionId;
    searchPlaceholder: string;
    groupsSearchQuery: string;
    onGroupsSearchQueryChange?: (value: string) => void;
    repositorySearchTerm: string;
    onRepositorySearchTermChange: (value: string) => void;
    onForumSearchOpen: () => void;
    children?: ReactNode;
};

export function ForumAppBarSearchField({
    activeSection,
    searchPlaceholder,
    groupsSearchQuery,
    onGroupsSearchQueryChange,
    repositorySearchTerm,
    onRepositorySearchTermChange,
    onForumSearchOpen,
    children,
}: ForumAppBarSearchFieldProps) {
    return (
        <div className={`${FORUM_REPO_SEARCH_BAR} flex-1 min-w-0`}>
            <div className="flex flex-1 items-center gap-2 px-3 min-w-0">
                <Search size={17} className="text-[#9AA3B2] shrink-0" aria-hidden />
                {activeSection === 'forum' ? (
                    <button
                        type="button"
                        data-testid="forum-search-trigger"
                        onClick={onForumSearchOpen}
                        onPointerEnter={prefetchCommunitySearchOverlay}
                        onFocus={prefetchCommunitySearchOverlay}
                        className="w-full min-h-[44px] text-right text-[16px] text-[#9AA3B2] truncate py-2"
                        aria-label="بحث في المنتدى والمستودع"
                    >
                        {searchPlaceholder}
                    </button>
                ) : activeSection === 'groups' ? (
                    <input
                        type="search"
                        value={groupsSearchQuery}
                        onChange={(e) => onGroupsSearchQueryChange?.(e.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label="بحث في المجموعات"
                        data-testid="forum-groups-search"
                        className="w-full bg-transparent text-[#F3F0EA] text-[16px] placeholder-[#9AA3B2]/55 outline-none"
                    />
                ) : (
                    <input
                        type="search"
                        value={repositorySearchTerm}
                        onChange={(e) => onRepositorySearchTermChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label="بحث في المستودع"
                        data-testid="forum-repository-search"
                        className="w-full bg-transparent text-[#F3F0EA] text-[16px] placeholder-[#9AA3B2]/55 outline-none"
                    />
                )}
            </div>
            {children}
        </div>
    );
}
