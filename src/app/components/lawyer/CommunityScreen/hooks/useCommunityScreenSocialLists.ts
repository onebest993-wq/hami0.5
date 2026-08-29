import { useEffect, useRef, useState } from 'react';
import { ForumApiService } from '@/app/services/forumApiService';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import { withForumAsyncTimeout } from '../forumAsync';
import {
    readForumSocialCache,
    warmForumSocialCache,
} from '@/app/services/forum/forumSocialWarmCache';
import { resolveInitialSocialGraph } from '../communitySocialGraphInit';
import type { SocialFollowerRow } from './useCommunityScreenSocialGraph.types';

const SOCIAL_FETCH_TIMEOUT_MS = 5_000;
const SOCIAL_CACHE_HYDRATE_MS = 2_000;

export function useCommunityScreenSocialLists(
    currentUserId: string | null,
    showFollowingPanel: boolean,
    surfaceOpen = true,
) {
    const initialSocial = resolveInitialSocialGraph(currentUserId);
    const [followingIds, setFollowingIds] = useState<Set<string>>(
        () => new Set(initialSocial.followingRecords.map((r) => r.followingId)),
    );
    const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);
    const [followingRecords, setFollowingRecords] = useState<ForumFollowRecord[]>(
        initialSocial.followingRecords,
    );
    const [followerRecords, setFollowerRecords] = useState<SocialFollowerRow[]>(
        initialSocial.followerRecords,
    );

    const followingRecordsRef = useRef(followingRecords);
    followingRecordsRef.current = followingRecords;
    const followerRecordsRef = useRef(followerRecords);
    followerRecordsRef.current = followerRecords;

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!currentUserId) {
            setFollowingIds(new Set());
            setFollowingRecords([]);
            setFollowerRecords([]);
            return;
        }

        let cancelled = false;

        const bootstrap = async () => {
            warmForumSocialCache(currentUserId);
            const warmed = await withForumAsyncTimeout(
                readForumSocialCache(currentUserId),
                SOCIAL_CACHE_HYDRATE_MS,
                { following: [], followers: [] },
            );
            if (!cancelled && warmed.following.length > 0) {
                setFollowingRecords(warmed.following);
                followingRecordsRef.current = warmed.following;
                setFollowingIds(new Set(warmed.following.map((r) => r.followingId)));
            }
            if (!cancelled && warmed.followers.length > 0) {
                setFollowerRecords(warmed.followers);
                followerRecordsRef.current = warmed.followers;
            }

            const [following, followers] = await Promise.all([
                withForumAsyncTimeout(
                    ForumApiService.listFollowing(currentUserId),
                    SOCIAL_FETCH_TIMEOUT_MS,
                    () => followingRecordsRef.current,
                ),
                withForumAsyncTimeout(
                    ForumApiService.listFollowers(currentUserId, currentUserId),
                    SOCIAL_FETCH_TIMEOUT_MS,
                    () =>
                        followerRecordsRef.current.map((row) => ({
                            followerId: row.followerId,
                            followingId: currentUserId,
                            createdAt: row.createdAt,
                        })),
                ),
            ]);

            if (cancelled) return;
            setFollowingRecords(following);
            followingRecordsRef.current = following;
            setFollowingIds(new Set(following.map((r) => r.followingId)));
            const nextFollowers = followers.map((r) => ({
                followerId: r.followerId,
                createdAt: r.createdAt,
            }));
            setFollowerRecords(nextFollowers);
            followerRecordsRef.current = nextFollowers;
        };

        void bootstrap();
        return () => {
            cancelled = true;
        };
    }, [currentUserId, surfaceOpen]);

    useEffect(() => {
        if (surfaceOpen === false) return;
        if (!showFollowingPanel || !currentUserId) return;
        let cancelled = false;
        void withForumAsyncTimeout(
            ForumApiService.listFollowers(currentUserId, currentUserId),
            SOCIAL_FETCH_TIMEOUT_MS,
            () =>
                followerRecordsRef.current.map((row) => ({
                    followerId: row.followerId,
                    followingId: currentUserId,
                    createdAt: row.createdAt,
                })),
        ).then((rows) => {
            if (cancelled) return;
            const next = rows.map((r) => ({ followerId: r.followerId, createdAt: r.createdAt }));
            setFollowerRecords(next);
            followerRecordsRef.current = next;
        });
        return () => {
            cancelled = true;
        };
    }, [showFollowingPanel, currentUserId, surfaceOpen]);

    return {
        followingIds,
        setFollowingIds,
        followBusyUserId,
        setFollowBusyUserId,
        followingRecords,
        setFollowingRecords,
        followerRecords,
        followingRecordsRef,
    };
}
