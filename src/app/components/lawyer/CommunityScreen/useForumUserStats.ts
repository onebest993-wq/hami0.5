import { useCallback, useEffect, useRef, useState } from 'react';
import { getUserPostCount } from '@/app/services/cloud/lawyerCommunityCloud';
import { ForumApiService } from '@/app/services/forumApiService';
import {
    COMMUNITY_USER_STATS_BATCH_LIMIT,
    COMMUNITY_USER_STATS_DEBOUNCE_MS,
} from './communityScreenConstants';

const USER_STATS_CACHE_LIMIT = 500;

export type ForumUserStats = Record<string, { followerCount: number; postCount: number }>;

export function useForumUserStats() {
    const [userStats, setUserStats] = useState<ForumUserStats>({});
    const userStatsCache = useRef<ForumUserStats>({});
    const pendingIdsRef = useRef<Set<string>>(new Set());
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const bumpFollowerCount = useCallback((userId: string, delta: number) => {
        const current = userStatsCache.current[userId] ?? { followerCount: 0, postCount: 0 };
        userStatsCache.current[userId] = {
            ...current,
            followerCount: Math.max(0, current.followerCount + delta),
        };
        setUserStats({ ...userStatsCache.current });
    }, []);

    const loadUserStats = useCallback(async (userIds: string[]) => {
        const uniqueIds = [...new Set(userIds.filter(Boolean))].slice(0, COMMUNITY_USER_STATS_BATCH_LIMIT);
        const uncached = uniqueIds.filter((id) => !userStatsCache.current[id]);
        if (uncached.length === 0) return;
        const results = await Promise.allSettled(
            uncached.map(async (id) => {
                const [followerCount, postCount] = await Promise.all([
                    ForumApiService.getFollowerCount(id),
                    getUserPostCount(id),
                ]);
                userStatsCache.current[id] = { followerCount, postCount };
            }),
        );
        results.forEach((r) => {
            if (r.status === 'rejected') {
                /* silent */
            }
        });

        const cacheKeys = Object.keys(userStatsCache.current);
        if (cacheKeys.length > USER_STATS_CACHE_LIMIT) {
            const excess = cacheKeys.length - USER_STATS_CACHE_LIMIT;
            const visibleIds = new Set(uniqueIds);
            const droppable = cacheKeys.filter((k) => !visibleIds.has(k)).slice(0, excess);
            for (const k of droppable) delete userStatsCache.current[k];
        }
        setUserStats({ ...userStatsCache.current });
    }, []);

    const flushQueuedUserStats = useCallback(() => {
        if (pendingIdsRef.current.size === 0) return;
        const batch = [...pendingIdsRef.current].slice(0, COMMUNITY_USER_STATS_BATCH_LIMIT);
        pendingIdsRef.current.clear();
        void loadUserStats(batch);
    }, [loadUserStats]);

    const queueLoadUserStats = useCallback(
        (userIds: string[]) => {
            for (const id of userIds) {
                if (id) pendingIdsRef.current.add(id);
            }
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                flushQueuedUserStats();
            }, COMMUNITY_USER_STATS_DEBOUNCE_MS);
        },
        [flushQueuedUserStats],
    );

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    return { userStats, bumpFollowerCount, loadUserStats, queueLoadUserStats };
}
