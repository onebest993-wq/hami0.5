import { describe, expect, it } from 'vitest';
import { COMMENT_MAX_LENGTH, resolveForumCommentContent } from '../communityCommentContent';

describe('resolveForumCommentContent', () => {
    it('يرفض الفارغ والمسافات', () => {
        expect(resolveForumCommentContent('')).toEqual({ ok: false, reason: 'empty' });
        expect(resolveForumCommentContent('   ')).toEqual({ ok: false, reason: 'empty' });
    });

    it('يرفض ما يتجاوز الحد', () => {
        expect(resolveForumCommentContent('أ'.repeat(COMMENT_MAX_LENGTH + 1))).toEqual({
            ok: false,
            reason: 'too_long',
        });
    });

    it('يقبل النص المقصوص', () => {
        expect(resolveForumCommentContent('  تعليق  ')).toEqual({ ok: true, content: 'تعليق' });
    });

    it('يزيل محارف التحكم من التعليق', () => {
        expect(resolveForumCommentContent('مرحبا\u0000عالم\u0007')).toEqual({
            ok: true,
            content: 'مرحباعالم',
        });
    });
});
