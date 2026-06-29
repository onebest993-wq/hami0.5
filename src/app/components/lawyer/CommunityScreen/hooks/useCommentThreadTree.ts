import { useMemo } from 'react';
import type { CommunityComment } from '@/app/services/lawyer-cloud';

export type CommentSortMode = 'oldest' | 'newest' | 'top';

function compareComments(a: CommunityComment, b: CommunityComment, sortMode: CommentSortMode): number {
    if (sortMode === 'newest') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (sortMode === 'top') {
        const ua = a.upvoterIds?.length ?? 0;
        const ub = b.upvoterIds?.length ?? 0;
        if (ua !== ub) return ub - ua;
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    }
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export function useCommentThreadTree(
    comments: CommunityComment[],
    bestCommentId: string | null,
    sortMode: CommentSortMode,
) {
    return useMemo(() => {
        const byId = new Map<string, CommunityComment>();
        for (const c of comments) byId.set(c.id, c);

        const normalized = comments.map((c) => {
            const parentId = typeof c.parentId === 'string' && byId.has(c.parentId) ? c.parentId : undefined;
            return { ...c, parentId };
        });

        const children = new Map<string | null, CommunityComment[]>();
        for (const c of normalized) {
            const key = c.parentId ?? null;
            if (!children.has(key)) children.set(key, []);
            children.get(key)!.push(c);
        }

        for (const list of children.values()) {
            list.sort((a, b) => compareComments(a, b, sortMode));
        }

        const best = bestCommentId ? byId.get(bestCommentId) ?? null : null;
        const subtree = new Set<string>();
        if (best) {
            const stack: string[] = [best.id];
            while (stack.length) {
                const id = stack.pop()!;
                if (subtree.has(id)) continue;
                subtree.add(id);
                const kids = children.get(id) ?? [];
                for (const k of kids) stack.push(k.id);
            }
        }

        return {
            commentById: byId,
            childrenByParentId: children,
            bestComment: best,
            bestSubtreeIds: subtree,
        };
    }, [comments, bestCommentId, sortMode]);
}
