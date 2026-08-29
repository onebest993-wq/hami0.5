import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { hasAnyActiveUrgentConsultation } from '@/app/services/forum/forumUrgentConsultation';
import { FORUM_FILTER_LABELS } from '../forumFilters';
import {
    COMMUNITY_POSTS_MAX_RETAINED,
    COMMUNITY_POSTS_PAGE_SIZE,
} from '../communityScreenConstants';
import { resolveCommunityForumPollMs } from '../communityFeedPolicy';
import type { CommunitySection } from '../communitySectionState';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';
import {
    computeVisibleCommunityPosts,
    trimCommunityPostsRetention,
} from './communityPostFeedUtils';
import { peekForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { useCommunityPostsFeedBootstrap } from './useCommunityPostsFeedBootstrap';
import { useCommunityPostsFeedDeepLink } from './useCommunityPostsFeedDeepLink';
import { useCommunityPostsFeedPaging } from './useCommunityPostsFeedPaging';

export type UseCommunityPostsFeedParams = {
    lists: Pick<CommunityDualPostLists, 'posts' | 'setPosts' | 'postsRef'>;
    mutedIds: Set<string>;
    currentUserId: string | null;
    followingIds: Set<string>;
    forumFeedScope: 'all' | 'following';
    selectedFilterIndex: number;
    authIsLoading: boolean;
    activeSection: CommunitySection;
    /** keepAlive مغلق: لا polling */
    surfaceOpen?: boolean;
    initialPostId?: string | null;
    initialOpenComments?: boolean;
    onOpenComments?: (postId: string) => void;
    onActivateForumSection?: () => void;
};

export function useCommunityPostsFeed({
    lists,
    mutedIds,
    currentUserId,
    followingIds,
    forumFeedScope,
    selectedFilterIndex,
    authIsLoading,
    activeSection,
    surfaceOpen = true,
    initialPostId = null,
    initialOpenComments = false,
    onOpenComments,
    onActivateForumSection,
}: UseCommunityPostsFeedParams) {
    const { posts, setPosts, postsRef } = lists;
    const [loadingPosts, setLoadingPosts] = useState(
        () =>
            (activeSection === 'forum' || Boolean(initialPostId)) &&
            !(peekForumPostsCache()?.length),
    );
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [urgentPriorityTick, setUrgentPriorityTick] = useState(0);
    const postsBootstrappedRef = useRef(false);
    const deepLinkHandledRef = useRef(false);
    const onActivateForumSectionRef = useRef(onActivateForumSection);
    onActivateForumSectionRef.current = onActivateForumSection;
    const onOpenCommentsRef = useRef(onOpenComments);
    onOpenCommentsRef.current = onOpenComments;
    const pageSize = COMMUNITY_POSTS_PAGE_SIZE;
    const forumPollMs = resolveCommunityForumPollMs();

    const applyPostsUpdate = useCallback(
        (updater: (prev: CommunityPost[]) => CommunityPost[]) => {
            setPosts((prev) => trimCommunityPostsRetention(updater(prev), COMMUNITY_POSTS_MAX_RETAINED));
        },
        [setPosts],
    );

    useCommunityPostsFeedBootstrap({
        activeSection,
        initialPostId,
        pageSize,
        postsRef,
        applyPostsUpdate,
        setLoadingPosts,
        setHasMore,
        postsBootstrappedRef,
        surfaceOpen,
    });

    const { refreshPosts, handleLoadMore } = useCommunityPostsFeedPaging({
        pageSize,
        postsRef,
        applyPostsUpdate,
        loadingMore,
        hasMore,
        setLoadingMore,
        setHasMore,
    });

    const forumPollEnabled =
        surfaceOpen !== false && !authIsLoading && activeSection === 'forum';
    useVisibilityAwareInterval(() => {
        void refreshPosts(true);
    }, forumPollMs, forumPollEnabled);

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!hasAnyActiveUrgentConsultation(posts)) return;
        const timerId = window.setInterval(() => {
            setUrgentPriorityTick((value) => value + 1);
        }, 60_000);
        return () => window.clearInterval(timerId);
    }, [posts, surfaceOpen]);

    useCommunityPostsFeedDeepLink({
        initialPostId,
        initialOpenComments,
        loadingPosts,
        postsRef,
        applyPostsUpdate,
        deepLinkHandledRef,
        onActivateForumSectionRef,
        onOpenCommentsRef,
        surfaceOpen,
    });

    const visiblePosts = useMemo(
        () =>
            computeVisibleCommunityPosts({
                posts,
                mutedIds,
                currentUserId,
                forumFeedScope,
                followingIds,
                selectedFilterIndex,
                filterLabels: FORUM_FILTER_LABELS,
                urgentPriorityTick,
            }),
        [
            posts,
            mutedIds,
            currentUserId,
            forumFeedScope,
            followingIds,
            selectedFilterIndex,
            urgentPriorityTick,
        ],
    );

    const allTags = useMemo(() => Array.from(new Set(posts.flatMap((p) => p.tags || []))), [posts]);

    return {
        loadingPosts,
        loadingMore,
        hasMore,
        visiblePosts,
        allTags,
        refreshPosts,
        handleLoadMore,
    };
}
