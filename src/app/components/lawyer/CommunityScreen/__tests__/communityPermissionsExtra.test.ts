import { describe, it, expect } from 'vitest';
import { canEditComment, canEditPost } from '../communityPermissions';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';

function buildPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'p1',
        authorId: 'author-1',
        authorName: 'A',
        content: 'x',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        ...overrides,
    };
}

function buildComment(overrides: Partial<CommunityComment> = {}): CommunityComment {
    return {
        id: 'c1',
        postId: 'p1',
        authorId: 'commenter-1',
        authorName: 'C',
        content: 'a',
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('canEditPost — صلاحيات إضافية للأدمن', () => {
    it('يسمح للأدمن بتعديل أي منشور (موافقة مع RLS)', () => {
        const post = buildPost();
        expect(canEditPost(post, 'admin-id', true)).toBe(true);
    });

    it('لا يزال يمنع غير المالك العادي', () => {
        const post = buildPost();
        expect(canEditPost(post, 'random', false)).toBe(false);
    });

    it('يسمح للمالك بالتعديل (دون أدمن)', () => {
        const post = buildPost();
        expect(canEditPost(post, 'author-1', false)).toBe(true);
    });
});

describe('canEditComment — قفل أفضل إجابة', () => {
    it('يسمح للمعلّق بالتعديل إن لم يكن تعليقه «أفضل إجابة»', () => {
        const c = buildComment();
        const post = buildPost({ bestCommentId: null });
        expect(canEditComment(c, 'commenter-1', post)).toBe(true);
    });

    it('يرفض تعديل تعليق مُميّز كأفضل إجابة (يحمي مالك المنشور)', () => {
        const c = buildComment({ id: 'c1' });
        const post = buildPost({ bestCommentId: 'c1' });
        expect(canEditComment(c, 'commenter-1', post)).toBe(false);
    });

    it('يسمح لتعليق آخر غير «أفضل إجابة»', () => {
        const c = buildComment({ id: 'c2' });
        const post = buildPost({ bestCommentId: 'c1' });
        expect(canEditComment(c, 'commenter-1', post)).toBe(true);
    });

    it('يرفض الغرباء حتى لو لم يكن «أفضل إجابة»', () => {
        const c = buildComment();
        expect(canEditComment(c, 'stranger')).toBe(false);
    });

    it('يرفض غير المسجّلين', () => {
        const c = buildComment();
        expect(canEditComment(c, null)).toBe(false);
    });
});
