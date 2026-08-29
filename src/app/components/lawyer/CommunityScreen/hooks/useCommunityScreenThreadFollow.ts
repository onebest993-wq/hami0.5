import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';

type UseCommunityScreenThreadFollowParams = {
    currentUserId: string | null;
    threadFollowingIds: Set<string>;
    setThreadFollowingIds: Dispatch<SetStateAction<Set<string>>>;
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityScreenThreadFollow({
    currentUserId,
    threadFollowingIds,
    setThreadFollowingIds,
    runInflight,
}: UseCommunityScreenThreadFollowParams) {
    const markThreadSubscribed = useCallback((postId: string) => {
        setThreadFollowingIds((prev) => new Set(prev).add(postId));
    }, [setThreadFollowingIds]);

    const handleToggleThreadFollow = useCallback(
        async (postId: string) => {
            if (!currentUserId) return;
            await runInflight(`thread:${postId}`, async () => {
                const wasFollowing = threadFollowingIds.has(postId);
                setThreadFollowingIds((prev) => {
                    const n = new Set(prev);
                    if (wasFollowing) n.delete(postId);
                    else n.add(postId);
                    return n;
                });
                SmartToast.success(wasFollowing ? 'أُلغيت متابعة النقاش' : 'ستصلك تنبيهات هذا النقاش');
                try {
                    const next = await ForumApiService.togglePostSubscription(postId, currentUserId);
                    setThreadFollowingIds((prev) => {
                        const n = new Set(prev);
                        if (next) n.add(postId);
                        else n.delete(postId);
                        return n;
                    });
                } catch {
                    setThreadFollowingIds((prev) => {
                        const n = new Set(prev);
                        if (wasFollowing) n.add(postId);
                        else n.delete(postId);
                        return n;
                    });
                    SmartToast.error('تعذّر تحديث متابعة النقاش');
                }
            });
        },
        [currentUserId, runInflight, setThreadFollowingIds, threadFollowingIds],
    );

    return { markThreadSubscribed, handleToggleThreadFollow };
}
