import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { RepositorySortKey } from '@/app/components/lawyer/CommunityScreen/repositoryListFilters';
import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import type { ForumGroupsSectionProps } from '@/app/components/lawyer/CommunityScreen/components/ForumGroupsSection';
import type { ForumPostListSharedProps } from '@/app/components/lawyer/CommunityScreen/components/ForumPostList';

export type CommunityScreenLazySectionPanesProps = {
    activeSection: CommunitySection;
    forumSurfaceOpen: boolean;
    forumFeedScope: 'all' | 'following';
    onForumFeedScopeChange: (scope: 'all' | 'following') => void;
    followingCount: number;
    loadingPosts: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    visiblePosts: CommunityPost[];
    onLoadMore: () => void;
    postListShared: ForumPostListSharedProps;
    repositoryMounted: boolean;
    groupsMounted: boolean;
    repositorySearchTerm: string;
    repositorySelectedType: string;
    repositorySortBy: RepositorySortKey;
    repositorySelectedTag: string | null;
} & Omit<ForumGroupsSectionProps, keyof ForumPostListSharedProps>;
