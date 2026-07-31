import { useCallback, useRef, useState } from 'react';

import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { peekForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';

/** قوائم المنشورات العامة والمجموعات + مساعدات التحديث المشتركة */
export function useCommunityDualPostLists() {
    const [posts, setPosts] = useState<CommunityPost[]>(() => peekForumPostsCache() ?? []);
    const [groupPosts, setGroupPosts] = useState<CommunityPost[]>([]);
    const postsRef = useRef(posts);
    postsRef.current = posts;
    const groupPostsRef = useRef(groupPosts);
    groupPostsRef.current = groupPosts;

    const findPostById = useCallback((postId: string): CommunityPost | null => {
        return (
            postsRef.current.find((p) => p.id === postId) ??
            groupPostsRef.current.find((p) => p.id === postId) ??
            null
        );
    }, []);

    const updatePostList = useCallback(
        (postId: string, updater: (prev: CommunityPost[]) => CommunityPost[]) => {
            if (groupPostsRef.current.some((p) => p.id === postId)) {
                setGroupPosts(updater);
            } else {
                setPosts(updater);
            }
        },
        [],
    );

    const removePostFromList = useCallback((postId: string) => {
        if (groupPostsRef.current.some((p) => p.id === postId)) {
            setGroupPosts((prev) => prev.filter((p) => p.id !== postId));
        } else {
            setPosts((prev) => prev.filter((p) => p.id !== postId));
        }
    }, []);

    return {
        posts,
        setPosts,
        groupPosts,
        setGroupPosts,
        postsRef,
        groupPostsRef,
        findPostById,
        updatePostList,
        removePostFromList,
    };
}

export type CommunityDualPostLists = ReturnType<typeof useCommunityDualPostLists>;
