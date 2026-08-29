import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';

const unfollowUser = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        unfollowUser: (...args: unknown[]) => unfollowUser(...args),
        followUser: vi.fn(),
        updateFollowPreferences: vi.fn(),
        togglePostSubscription: vi.fn(),
    },
}));

import { useCommunityScreenFollowActions } from '../useCommunityScreenFollowActions';

const snapshot: ForumFollowRecord = {
    followerId: 'u1',
    followingId: 'u2',
    createdAt: '2020-01-01T00:00:00.000Z',
    notifyPosts: false,
    notifyComments: true,
    notifyReplies: false,
};

describe('useCommunityScreenFollowActions', () => {
    it('يعيد لقطة تفضيلات المتابعة عند فشل الإلغاء', async () => {
        unfollowUser.mockRejectedValueOnce(new Error('fail'));
        const bumpFollowerCount = vi.fn();
        const { result } = renderHook(() => {
            const [followingIds, setFollowingIds] = useState(new Set(['u2']));
            const [followingRecords, setFollowingRecords] = useState([snapshot]);
            const followingRecordsRef = useRef(followingRecords);
            followingRecordsRef.current = followingRecords;
            const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);
            const [threadFollowingIds, setThreadFollowingIds] = useState(new Set<string>());
            const actions = useCommunityScreenFollowActions({
                currentUserId: 'u1',
                authUser: { user_metadata: { fullName: 'محامي' } },
                bumpFollowerCount,
                toggleMute: vi.fn(),
                isMuted: () => false,
                followingIds,
                setFollowingIds,
                setFollowingRecords,
                followingRecordsRef,
                followBusyUserId,
                setFollowBusyUserId,
                threadFollowingIds,
                setThreadFollowingIds,
                runInflight: async (_key, action) => {
                    await action();
                },
            });
            return { actions, followingRecords };
        });

        await act(async () => {
            await result.current.actions.handleFollow('u2');
        });

        expect(result.current.followingRecords).toEqual([snapshot]);
        expect(bumpFollowerCount).toHaveBeenCalledWith('u2', -1);
        expect(bumpFollowerCount).toHaveBeenCalledWith('u2', 1);
    });
});
