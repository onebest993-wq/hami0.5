import { useEffect, type MutableRefObject } from 'react';

import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { normalizeCommunityPostsPage } from './communityPostFeedUtils';

export function useCommunityPostsFeedDeepLink({
    initialPostId,
    initialOpenComments,
    loadingPosts,
    postsRef,
    applyPostsUpdate,
    deepLinkHandledRef,
    onActivateForumSectionRef,
    onOpenCommentsRef,
    surfaceOpen = true,
}: {
    initialPostId?: string | null;
    initialOpenComments?: boolean;
    loadingPosts: boolean;
    postsRef: MutableRefObject<CommunityPost[]>;
    applyPostsUpdate: (updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
    deepLinkHandledRef: MutableRefObject<boolean>;
    onActivateForumSectionRef: MutableRefObject<(() => void) | undefined>;
    onOpenCommentsRef: MutableRefObject<((postId: string) => void) | undefined>;
    surfaceOpen?: boolean;
}) {
    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!initialPostId || loadingPosts || deepLinkHandledRef.current) return;
        let cancelled = false;
        void (async () => {
            let target = postsRef.current.find((p) => p.id === initialPostId) ?? null;
            if (!target) {
                target = await ForumApiService.getPostById(initialPostId);
                if (target && !cancelled) {
                    const resolved = normalizeCommunityPostsPage([target])[0]!;
                    applyPostsUpdate((prev) =>
                        prev.some((p) => p.id === resolved.id) ? prev : [resolved, ...prev],
                    );
                }
            }
            if (cancelled || !target) return;
            onActivateForumSectionRef.current?.();
            if (initialOpenComments) {
                onOpenCommentsRef.current?.(initialPostId);
            }
            deepLinkHandledRef.current = true;
            requestAnimationFrame(() => {
                document.getElementById(`forum-post-${initialPostId}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [
        initialOpenComments,
        initialPostId,
        loadingPosts,
        applyPostsUpdate,
        postsRef,
        deepLinkHandledRef,
        onActivateForumSectionRef,
        onOpenCommentsRef,
        surfaceOpen,
    ]);
}
