import { describe, expect, it } from 'vitest';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import {
    canDeleteComment,
    canDeletePost,
    canEditComment,
    canEditPost,
    canPinPost,
    canUpvotePost,
} from './communityPermissions';

const post = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
    id: 'p1',
    authorId: 'author-1',
    authorName: 'محامي',
    content: 'نص تجريبي للمنشور',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachment: null,
    upvoterIds: [],
    comments: [],
    bestCommentId: null,
    ...overrides,
});

const comment = (overrides: Partial<CommunityComment> = {}): CommunityComment => ({
    id: 'c1',
    postId: 'p1',
    authorId: 'commenter-1',
    authorName: 'زميل',
    content: 'تعليق',
    createdAt: new Date().toISOString(),
    ...overrides,
});

describe('communityPermissions', () => {
    it('allows only owner to edit post', () => {
        const p = post();
        expect(canEditPost(p, 'author-1')).toBe(true);
        expect(canEditPost(p, 'other')).toBe(false);
        expect(canEditPost(p, null)).toBe(false);
    });

    it('allows owner or admin to delete post', () => {
        const p = post();
        expect(canDeletePost(p, 'author-1', false)).toBe(true);
        expect(canDeletePost(p, 'other', false)).toBe(false);
        expect(canDeletePost(p, 'admin', true)).toBe(true);
    });

    it('allows only admin to pin', () => {
        expect(canPinPost(true)).toBe(true);
        expect(canPinPost(false)).toBe(false);
    });

    it('blocks self-upvote', () => {
        const p = post({ authorId: 'u1' });
        expect(canUpvotePost(p, 'u1')).toBe(false);
        expect(canUpvotePost(p, 'u2')).toBe(true);
    });

    it('allows comment author, post author, or admin to delete comment', () => {
        const p = post({ authorId: 'author-1' });
        const c = comment({ authorId: 'commenter-1' });
        expect(canDeleteComment(p, c, 'commenter-1', false)).toBe(true);
        expect(canDeleteComment(p, c, 'author-1', false)).toBe(true);
        expect(canDeleteComment(p, c, 'stranger', false)).toBe(false);
        expect(canDeleteComment(p, c, 'stranger', true)).toBe(true);
    });

    it('allows only comment author to edit comment', () => {
        const c = comment({ authorId: 'commenter-1' });
        expect(canEditComment(c, 'commenter-1')).toBe(true);
        expect(canEditComment(c, 'author-1')).toBe(false);
    });
});
