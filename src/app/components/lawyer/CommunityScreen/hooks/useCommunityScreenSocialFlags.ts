import { useEffect, useRef, useState } from 'react';
import { ForumApiService } from '@/app/services/forumApiService';
import { withForumAsyncTimeout } from '../forumAsync';

const SOCIAL_FETCH_TIMEOUT_MS = 5_000;

export function useCommunityScreenSocialFlags(currentUserId: string | null, surfaceOpen = true) {
    const [isBanned, setIsBanned] = useState(false);
    const [threadFollowingIds, setThreadFollowingIds] = useState<Set<string>>(new Set());
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

    const bookmarkedIdsRef = useRef(bookmarkedIds);
    bookmarkedIdsRef.current = bookmarkedIds;
    const threadFollowingIdsRef = useRef(threadFollowingIds);
    threadFollowingIdsRef.current = threadFollowingIds;
    const isBannedRef = useRef(isBanned);
    isBannedRef.current = isBanned;

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!currentUserId) {
            setIsBanned(false);
            return;
        }
        let cancelled = false;
        void withForumAsyncTimeout(
            ForumApiService.isUserBanned(currentUserId),
            SOCIAL_FETCH_TIMEOUT_MS,
            () => isBannedRef.current,
        ).then((banned) => {
            if (!cancelled) setIsBanned(banned);
        });
        return () => {
            cancelled = true;
        };
    }, [currentUserId, surfaceOpen]);

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!currentUserId) {
            setThreadFollowingIds(new Set());
            return;
        }
        let cancelled = false;
        void withForumAsyncTimeout(
            ForumApiService.listPostSubscriptions(currentUserId),
            SOCIAL_FETCH_TIMEOUT_MS,
            () => [...threadFollowingIdsRef.current],
        ).then((ids) => {
            if (!cancelled) setThreadFollowingIds(new Set(ids));
        });
        return () => {
            cancelled = true;
        };
    }, [currentUserId, surfaceOpen]);

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!currentUserId) {
            setBookmarkedIds(new Set());
            return;
        }
        let cancelled = false;
        void withForumAsyncTimeout(
            ForumApiService.listBookmarks(currentUserId),
            SOCIAL_FETCH_TIMEOUT_MS,
            () => [...bookmarkedIdsRef.current],
        ).then((ids) => {
            if (!cancelled) setBookmarkedIds(new Set(ids));
        });
        return () => {
            cancelled = true;
        };
    }, [currentUserId, surfaceOpen]);

    return {
        isBanned,
        threadFollowingIds,
        setThreadFollowingIds,
        bookmarkedIds,
        setBookmarkedIds,
    };
}
