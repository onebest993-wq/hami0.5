import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { CommunityComment } from '@/app/services/lawyer-cloud';
import { COMMENT_INITIAL_WINDOW, useCommentThreadWindow } from '../useCommentThreadWindow';

function comment(id: string): CommunityComment {
    return {
        id,
        postId: 'p1',
        authorId: 'u1',
        authorName: 'محامي',
        content: 'تعليق',
        createdAt: '2026-01-01T00:00:00.000Z',
    };
}

describe('useCommentThreadWindow', () => {
    it('يعرض نافذة أولية ويحسب المخفي', () => {
        const threads = Array.from({ length: 45 }, (_, i) => comment(`c${i}`));
        const { result } = renderHook(() => useCommentThreadWindow('p1', 'oldest', threads));
        expect(result.current.windowedTopThreads).toHaveLength(COMMENT_INITIAL_WINDOW);
        expect(result.current.hiddenThreadCount).toBe(15);
    });
});
