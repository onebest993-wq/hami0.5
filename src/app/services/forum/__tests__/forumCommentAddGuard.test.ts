import { describe, expect, it } from 'vitest';
import {
    FORUM_COMMENT_MAX_DEPTH,
    assertForumPostAcceptsComments,
    resolveForumReplyParentId,
} from '@/app/services/forum/forumCommentAddGuard';

describe('forumCommentAddGuard', () => {
    it('يرفض التعليق على منشور مقفل', () => {
        expect(() => assertForumPostAcceptsComments({ isLocked: true })).toThrow('مقفل');
        expect(() => assertForumPostAcceptsComments({ isLocked: false })).not.toThrow();
    });

    it('يرفض parentId من خارج المنشور', () => {
        expect(() =>
            resolveForumReplyParentId([{ id: 'c1', parentId: undefined }], 'foreign-c'),
        ).toThrow('التعليق الأصل');
    });

    it('يقبل رداً مباشراً على تعليق موجود', () => {
        expect(resolveForumReplyParentId([{ id: 'c1', parentId: undefined }], 'c1')).toEqual({
            parentId: 'c1',
        });
    });

    it('يرفض سلسلة أعمق من الحد', () => {
        const comments = Array.from({ length: FORUM_COMMENT_MAX_DEPTH }, (_, i) => ({
            id: `c${i}`,
            parentId: i === 0 ? undefined : `c${i - 1}`,
        }));
        const deepest = comments[FORUM_COMMENT_MAX_DEPTH - 1];
        expect(() => resolveForumReplyParentId(comments, deepest.id)).toThrow('تداخل');
    });
});
