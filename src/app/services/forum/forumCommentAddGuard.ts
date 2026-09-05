import type { CommunityComment, CommunityPost } from '@/app/services/forum/forumTypes';

export const FORUM_COMMENT_MAX_DEPTH = 6;

export function assertForumPostAcceptsComments(post: Pick<CommunityPost, 'isLocked'>): void {
    if (post.isLocked === true) {
        throw new Error('النقاش على هذا المنشور مقفل');
    }
}

/** يرفض parentId من منشور آخر وتداخلاً أعمق من الحد */
export function resolveForumReplyParentId(
    comments: Pick<CommunityComment, 'id' | 'parentId'>[],
    parentId: string | undefined,
): { parentId?: string } {
    const trimmed = parentId?.trim();
    if (!trimmed) return {};
    const parent = comments.find((c) => c.id === trimmed);
    if (!parent) {
        throw new Error('التعليق الأصل غير موجود في هذا المنشور');
    }
    let depth = 1;
    let cursor: typeof parent | undefined = parent;
    const seen = new Set<string>();
    while (cursor?.parentId) {
        if (seen.has(cursor.id)) break;
        seen.add(cursor.id);
        const next = comments.find((c) => c.id === cursor!.parentId);
        if (!next) break;
        depth += 1;
        if (depth >= FORUM_COMMENT_MAX_DEPTH) {
            throw new Error('تجاوزت حد تداخل الردود');
        }
        cursor = next;
    }
    return { parentId: trimmed };
}
