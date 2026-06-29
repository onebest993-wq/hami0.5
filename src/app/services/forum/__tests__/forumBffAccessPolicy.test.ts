import { describe, expect, it } from 'vitest';
import {
    assertForumGroupWriteAccess,
    canMutateForumPostFields,
    canViewForumGroupPost,
} from '../forumBffAccessPolicy';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function post(partial: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'p1',
        authorId: 'owner',
        authorName: 'x',
        content: 'content long enough',
        tags: [],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        attachment: null,
        upvoterIds: [],
        comments: [],
        ...partial,
    };
}

describe('forumBffAccessPolicy', () => {
    it('canViewForumGroupPost يسمح للعضو أو المشرف', () => {
        expect(canViewForumGroupPost(post({ groupId: 'g1' }), true, false)).toBe(true);
        expect(canViewForumGroupPost(post({ groupId: 'g1' }), false, true)).toBe(true);
        expect(canViewForumGroupPost(post({ groupId: 'g1' }), false, false)).toBe(false);
        expect(canViewForumGroupPost(post({ groupId: undefined }), false, false)).toBe(true);
    });

    it('canMutateForumPostFields للمالك أو المشرف', () => {
        expect(canMutateForumPostFields(post(), 'owner', false)).toBe(true);
        expect(canMutateForumPostFields(post(), 'other', true)).toBe(true);
        expect(canMutateForumPostFields(post(), 'other', false)).toBe(false);
    });

    it('assertForumGroupWriteAccess يرفض غير العضو', () => {
        expect(() => assertForumGroupWriteAccess('g1', false, false)).toThrow();
        expect(() => assertForumGroupWriteAccess('g1', true, false)).not.toThrow();
    });
});
