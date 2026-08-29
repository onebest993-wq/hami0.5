import { useCallback, useEffect } from 'react';
import { prefetchRoyalLawyerProfile } from '@/app/utils/lazyComponents';
import { scheduleCommunityProfileOverlayPrefetch } from '../communityOverlayPrefetch';
import {
    COMMUNITY_USER_STATS_COMMENTS_PER_POST,
    COMMUNITY_USER_STATS_VISIBLE_LIMIT,
} from '../communityScreenConstants';
import type { CommunitySection } from '../communitySectionState';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

type UseCommunityScreenInteractionsParams = {
    forumSurfaceOpen: boolean;
    currentUserId: string | null;
    onOpenOwnProfile?: () => void;
    loadUserStats: (ids: string[]) => void;
    queueLoadUserStats: (ids: string[]) => void;
    setProfileView: (view: { userId: string; displayName?: string } | null) => void;
    setActiveSection: (section: CommunitySection) => void;
    setRepositorySearchTerm: (value: string) => void;
    closeSearchOverlay: () => void;
    setCommentingPostId: (id: string | null) => void;
    activeSection: CommunitySection;
    activeGroupId: string | null;
    groupVisiblePosts: CommunityPost[];
    visiblePosts: CommunityPost[];
};

export function useCommunityScreenInteractions({
    forumSurfaceOpen,
    currentUserId,
    onOpenOwnProfile,
    loadUserStats,
    queueLoadUserStats,
    setProfileView,
    setActiveSection,
    setRepositorySearchTerm,
    closeSearchOverlay,
    setCommentingPostId,
    activeSection,
    activeGroupId,
    groupVisiblePosts,
    visiblePosts,
}: UseCommunityScreenInteractionsParams) {
    const openForumProfile = useCallback(
        (userId: string, displayName?: string) => {
            if (!userId) return;
            if (userId === currentUserId && onOpenOwnProfile) {
                onOpenOwnProfile();
                return;
            }
            void prefetchRoyalLawyerProfile(userId);
            void loadUserStats([userId]);
            setProfileView({ userId, displayName });
        },
        [currentUserId, onOpenOwnProfile, loadUserStats, setProfileView],
    );

    const closeForumProfile = useCallback(() => setProfileView(null), [setProfileView]);

    useEffect(() => {
        if (!forumSurfaceOpen) return;
        scheduleCommunityProfileOverlayPrefetch();
    }, [forumSurfaceOpen]);

    useEffect(() => {
        const feedPosts =
            activeSection === 'groups' && activeGroupId ? groupVisiblePosts : visiblePosts;
        const slice = feedPosts.slice(0, COMMUNITY_USER_STATS_VISIBLE_LIMIT);
        const authorIds = slice.map((p) => p.authorId).filter(Boolean);
        const commentIds = slice.flatMap((p) =>
            p.comments
                .slice(0, COMMUNITY_USER_STATS_COMMENTS_PER_POST)
                .map((c) => c.authorId)
                .filter(Boolean),
        );
        queueLoadUserStats([...authorIds, ...commentIds]);
    }, [activeGroupId, activeSection, groupVisiblePosts, queueLoadUserStats, visiblePosts]);

    const handleNavigateToPost = useCallback(
        (postId: string) => {
            setActiveSection('forum');
            window.setTimeout(() => {
                document.getElementById(`forum-post-${postId}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }, 120);
        },
        [setActiveSection],
    );

    const handleSearchOpenPost = useCallback(
        (postId: string) => {
            closeSearchOverlay();
            handleNavigateToPost(postId);
        },
        [closeSearchOverlay, handleNavigateToPost],
    );

    const handleSearchOpenDocument = useCallback(
        (doc: RepositoryDocument) => {
            setActiveSection('repository');
            setRepositorySearchTerm(doc.title);
            closeSearchOverlay();
        },
        [closeSearchOverlay, setActiveSection, setRepositorySearchTerm],
    );

    const openCommentSheet = useCallback((id: string) => {
        void import('@/app/components/lawyer/CommunityScreen/communityScreenLazyOverlays').then((m) =>
            m.prefetchCommunityCommentOverlay(),
        );
        setCommentingPostId(id);
    }, [setCommentingPostId]);

    return {
        openForumProfile,
        closeForumProfile,
        handleNavigateToPost,
        handleSearchOpenPost,
        handleSearchOpenDocument,
        openCommentSheet,
    };
}
