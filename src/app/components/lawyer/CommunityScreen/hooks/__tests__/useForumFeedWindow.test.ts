import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForumFeedWindow } from '../useForumFeedWindow';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function makePosts(count: number): CommunityPost[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `p-${i}`,
        authorId: 'u1',
        authorName: 'u',
        content: 'content long enough for test',
        tags: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        attachment: null,
        upvoterIds: [],
        comments: [],
    }));
}

describe('useForumFeedWindow', () => {
    it('يعرض نافذة أولية ثم يوسّعها', () => {
        const posts = makePosts(40);
        const { result } = renderHook(() => useForumFeedWindow(posts, 10));
        expect(result.current.windowedPosts).toHaveLength(10);
        expect(result.current.hiddenCount).toBe(30);

        act(() => {
            result.current.sentinelRef.current = document.createElement('div');
        });
    });
});
