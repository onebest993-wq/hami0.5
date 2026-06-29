import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { CommunityComment } from '@/app/services/lawyer-cloud';
import { useCommentThreadTree } from '../useCommentThreadTree';

const makeComment = (id: string, parentId?: string): CommunityComment => ({
    id,
    authorId: 'a1',
    authorName: 'محامي',
    content: 'نص',
    createdAt: '2026-01-01T00:00:00.000Z',
    parentId,
    upvoterIds: [],
});

describe('useCommentThreadTree', () => {
    it('يبني شجرة التعليقات ويحدّد فرع أفضل إجابة', () => {
        const comments = [
            makeComment('c1'),
            makeComment('c2'),
            makeComment('c3', 'c2'),
        ];
        const { result } = renderHook(() => useCommentThreadTree(comments, 'c2', 'oldest'));
        expect(result.current.bestComment?.id).toBe('c2');
        expect(result.current.bestSubtreeIds.has('c2')).toBe(true);
        expect(result.current.bestSubtreeIds.has('c3')).toBe(true);
        const roots = result.current.childrenByParentId.get(null) ?? [];
        expect(roots.map((c) => c.id)).toEqual(['c1', 'c2']);
        expect(result.current.childrenByParentId.get('c2')?.map((c) => c.id)).toEqual(['c3']);
    });
});
