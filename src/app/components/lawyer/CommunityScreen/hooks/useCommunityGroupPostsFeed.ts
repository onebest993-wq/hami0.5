import { useCallback, useEffect, useMemo, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
import { COMMUNITY_POSTS_PAGE_SIZE, COMMUNITY_GROUP_POSTS_MAX_RETAINED } from '../communityScreenConstants';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';
import {
    computeGroupVisiblePosts,
    mergeSortedCommunityPosts,
    normalizeCommunityPostsPage,
    trimCommunityPostsRetention,
} from './communityPostFeedUtils';

export type UseCommunityGroupPostsFeedParams = {
    lists: Pick<CommunityDualPostLists, 'groupPosts' | 'setGroupPosts' | 'groupPostsRef'>;
    mutedIds: Set<string>;
    currentUserId: string | null;
    activeGroupId: string | null;
    surfaceOpen?: boolean;
};

export function useCommunityGroupPostsFeed({
    lists,
    mutedIds,
    currentUserId,
    activeGroupId,
    surfaceOpen = true,
}: UseCommunityGroupPostsFeedParams) {
    const { groupPosts, setGroupPosts, groupPostsRef } = lists;
    const [groupPostsLoading, setGroupPostsLoading] = useState(false);
    const [groupPostsHasMore, setGroupPostsHasMore] = useState(true);
    const [groupPostsLoadingMore, setGroupPostsLoadingMore] = useState(false);
    const pageSize = COMMUNITY_POSTS_PAGE_SIZE;

    const applyGroupPostsUpdate = useCallback(
        (updater: (prev: CommunityPost[]) => CommunityPost[]) => {
            setGroupPosts((prev) =>
                trimCommunityPostsRetention(updater(prev), COMMUNITY_GROUP_POSTS_MAX_RETAINED),
            );
        },
        [setGroupPosts],
    );

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!activeGroupId) {
            setGroupPosts([]);
            setGroupPostsHasMore(true);
            return;
        }
        let cancelled = false;
        setGroupPostsLoading(true);
        void ForumApiService.listPostsPaginated(pageSize, 0, { groupId: activeGroupId })
            .then(({ posts: page }) => {
                if (cancelled) return;
                setGroupPosts(
                    trimCommunityPostsRetention(
                        sortCommunityPosts(normalizeCommunityPostsPage(page)),
                        COMMUNITY_GROUP_POSTS_MAX_RETAINED,
                    ),
                );
                setGroupPostsHasMore(page.length === pageSize);
            })
            .catch(() => {
                if (!cancelled) SmartToast.error('تعذّر تحميل منشورات المجموعة');
            })
            .finally(() => {
                if (!cancelled) setGroupPostsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [activeGroupId, pageSize, setGroupPosts, surfaceOpen]);

    const groupVisiblePosts = useMemo(
        () => computeGroupVisiblePosts(groupPosts, mutedIds, currentUserId),
        [groupPosts, mutedIds, currentUserId],
    );

    const handleLoadMoreGroupPosts = useCallback(async () => {
        if (!activeGroupId || groupPostsLoadingMore || !groupPostsHasMore) return;
        setGroupPostsLoadingMore(true);
        try {
            const { posts: nextPage } = await ForumApiService.listPostsPaginated(
                pageSize,
                groupPostsRef.current.length,
                { groupId: activeGroupId },
            );
            applyGroupPostsUpdate((prev) => mergeSortedCommunityPosts(prev, nextPage));
            setGroupPostsHasMore(nextPage.length === pageSize);
        } catch {
            SmartToast.error('تعذّر تحميل المزيد');
        } finally {
            setGroupPostsLoadingMore(false);
        }
    }, [
        activeGroupId,
        applyGroupPostsUpdate,
        groupPostsHasMore,
        groupPostsLoadingMore,
        groupPostsRef,
        pageSize,
    ]);

    const appendPublishedGroupPost = useCallback(
        (saved: CommunityPost) => {
            applyGroupPostsUpdate((prev) => mergeSortedCommunityPosts(prev, [saved]));
        },
        [applyGroupPostsUpdate],
    );

    return {
        groupPostsLoading,
        groupPostsHasMore,
        groupPostsLoadingMore,
        groupVisiblePosts,
        handleLoadMoreGroupPosts,
        appendPublishedGroupPost,
    };
}
