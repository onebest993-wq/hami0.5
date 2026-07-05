import { useCallback, useEffect, useMemo, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { ForumApiService } from '@/app/services/forumApiService';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import { sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
import { COMMUNITY_POSTS_PAGE_SIZE, COMMUNITY_GROUP_POSTS_MAX_RETAINED } from '../communityScreenConstants';
import type { CommunitySection } from '../communitySectionState';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';
import {
    computeGroupVisiblePosts,
    mergeSortedCommunityPosts,
    normalizeCommunityPostsPage,
    trimCommunityPostsRetention,
} from './communityPostFeedUtils';
import { withForumAsyncTimeout } from '../forumAsync';
import { createForumGroupResilient } from '../forumGroupCreate';

export type UseCommunityGroupsFeedParams = {
    lists: Pick<CommunityDualPostLists, 'groupPosts' | 'setGroupPosts' | 'groupPostsRef'>;
    mutedIds: Set<string>;
    currentUserId: string | null;
    authIsLoading: boolean;
    activeSection: CommunitySection;
};

export function useCommunityGroupsFeed({
    lists,
    mutedIds,
    currentUserId,
    authIsLoading,
    activeSection,
}: UseCommunityGroupsFeedParams) {
    const { groupPosts, setGroupPosts, groupPostsRef } = lists;
    const [groups, setGroups] = useState<ForumGroup[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [groupsSearchQuery, setGroupsSearchQuery] = useState('');
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [groupPostsLoading, setGroupPostsLoading] = useState(false);
    const [groupPostsHasMore, setGroupPostsHasMore] = useState(true);
    const [groupPostsLoadingMore, setGroupPostsLoadingMore] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [submittingGroup, setSubmittingGroup] = useState(false);
    const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
    const [leavingGroup, setLeavingGroup] = useState(false);
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
        if (authIsLoading || activeGroupId) return;
        let cancelled = false;
        setGroupsLoading(true);
        void withForumAsyncTimeout(ForumApiService.listGroups(groupsSearchQuery), 8_000, [])
            .then((rows) => {
                if (!cancelled) setGroups(rows);
            })
            .catch(() => {
                if (!cancelled) SmartToast.error('تعذّر تحميل المجموعات');
            })
            .finally(() => {
                if (!cancelled) setGroupsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [authIsLoading, activeGroupId, groupsSearchQuery]);

    useEffect(() => {
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
    }, [activeGroupId, pageSize, setGroupPosts]);

    const activeGroup = useMemo(
        () => (activeGroupId ? groups.find((g) => g.id === activeGroupId) ?? null : null),
        [activeGroupId, groups],
    );

    const groupVisiblePosts = useMemo(
        () => computeGroupVisiblePosts(groupPosts, mutedIds, currentUserId),
        [groupPosts, mutedIds, currentUserId],
    );

    const clearActiveGroup = useCallback(() => setActiveGroupId(null), []);

    const handleJoinGroup = useCallback(
        async (groupId: string) => {
            if (!currentUserId) {
                SmartToast.warning('سجّل الدخول للانضمام');
                return;
            }
            setJoiningGroupId(groupId);
            try {
                const updated = await ForumApiService.joinGroup(groupId, currentUserId);
                setGroups((prev) => prev.map((g) => (g.id === groupId ? updated : g)));
                SmartToast.success('انضممت للمجموعة');
            } catch (err) {
                const message =
                    err instanceof Error && err.message.trim()
                        ? err.message
                        : 'تعذّر الانضمام للمجموعة';
                SmartToast.error(message);
            } finally {
                setJoiningGroupId(null);
            }
        },
        [currentUserId],
    );

    const handleOpenGroup = useCallback(
        (groupId: string) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group?.isMember) return;
            setActiveGroupId(groupId);
        },
        [groups],
    );

    const handleLeaveGroup = useCallback(async () => {
        if (!activeGroupId) return;
        setLeavingGroup(true);
        try {
            await ForumApiService.leaveGroup(activeGroupId, currentUserId);
            setActiveGroupId(null);
            const rows = await ForumApiService.listGroups(groupsSearchQuery);
            setGroups(rows);
            SmartToast.success('غادرت المجموعة');
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر مغادرة المجموعة';
            SmartToast.error(message);
        } finally {
            setLeavingGroup(false);
        }
    }, [activeGroupId, currentUserId, groupsSearchQuery]);

    const handleCreateGroup = useCallback(async () => {
        const name = newGroupName.trim();
        const description = newGroupDesc.trim();
        if (!currentUserId) {
            SmartToast.warning('سجّل الدخول لإنشاء مجموعة');
            return;
        }
        if (name.length < 3) {
            SmartToast.warning('اسم المجموعة قصير جداً (3 أحرف على الأقل)');
            return;
        }
        if (description.length < 10) {
            SmartToast.warning('اكتب وصفاً أوضح للمجموعة (10 أحرف على الأقل)');
            return;
        }
        setSubmittingGroup(true);
        try {
            const group = await createForumGroupResilient({ name, description }, currentUserId);
            setGroups((prev) => [group, ...prev.filter((g) => g.id !== group.id)]);
            setIsCreateGroupOpen(false);
            setNewGroupName('');
            setNewGroupDesc('');
            SmartToast.success('تم إنشاء المجموعة');
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذّر إنشاء المجموعة';
            SmartToast.error(message);
        } finally {
            setSubmittingGroup(false);
        }
    }, [currentUserId, newGroupDesc, newGroupName]);

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
        groups,
        groupsLoading,
        groupsSearchQuery,
        setGroupsSearchQuery,
        activeGroupId,
        setActiveGroupId,
        clearActiveGroup,
        activeGroup,
        groupPostsLoading,
        groupPostsHasMore,
        groupPostsLoadingMore,
        groupVisiblePosts,
        isCreateGroupOpen,
        setIsCreateGroupOpen,
        newGroupName,
        setNewGroupName,
        newGroupDesc,
        setNewGroupDesc,
        submittingGroup,
        joiningGroupId,
        leavingGroup,
        handleJoinGroup,
        handleOpenGroup,
        handleLeaveGroup,
        handleCreateGroup,
        handleLoadMoreGroupPosts,
        appendPublishedGroupPost,
    };
}
