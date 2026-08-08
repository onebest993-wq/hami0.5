import { describe, it, expect } from 'vitest';

import type { CommunityPost } from '@/app/services/lawyer-cloud';
import {
    computeVisibleCommunityPosts,
    trimCommunityPostsRetention,
} from '../communityPostFeedUtils';

const basePost = (id: string, authorId: string, groupId?: string): CommunityPost => ({
    id,
    authorId,
    authorName: 'محامٍ',
    content: 'استشارة قانونية عامة',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    attachment: null,
    upvoterIds: [],
    comments: [],
    bestCommentId: null,
    ...(groupId ? { groupId } : {}),
});

describe('computeVisibleCommunityPosts', () => {
    it('يستبعد منشورات المجموعات والمكتومين', () => {
        const posts = [
            basePost('a', 'u1'),
            basePost('b', 'u2', 'grp-1'),
            basePost('c', 'muted-user'),
        ];
        const visible = computeVisibleCommunityPosts({
            posts,
            mutedIds: new Set(['muted-user']),
            currentUserId: 'me',
            forumFeedScope: 'all',
            followingIds: new Set(),
            selectedFilterIndex: 0,
            filterLabels: ['الكل', 'الأكثر تصويتاً'],
        });
        expect(visible.map((p) => p.id)).toEqual(['a']);
    });

    it('يُظهر منشورات المتابَعين فقط في نطاق following', () => {
        const posts = [basePost('a', 'followed'), basePost('b', 'stranger')];
        const visible = computeVisibleCommunityPosts({
            posts,
            mutedIds: new Set(),
            currentUserId: 'me',
            forumFeedScope: 'following',
            followingIds: new Set(['followed']),
            selectedFilterIndex: 0,
            filterLabels: ['الكل'],
        });
        expect(visible.map((p) => p.id)).toEqual(['a']);
    });

    it('يُظهر منشورات المستخدم نفسه في نطاق following', () => {
        const posts = [basePost('mine', 'me'), basePost('other', 'stranger')];
        const visible = computeVisibleCommunityPosts({
            posts,
            mutedIds: new Set(),
            currentUserId: 'me',
            forumFeedScope: 'following',
            followingIds: new Set(['followed']),
            selectedFilterIndex: 0,
            filterLabels: ['الكل'],
        });
        expect(visible.map((p) => p.id)).toEqual(['mine']);
    });

    it('يُزيل تكرار المعرّفات في القائمة المصدر', () => {
        const older = basePost('dup', 'u1');
        const newer = { ...older, content: 'نص محدّث', updatedAt: '2026-02-01T00:00:00.000Z' };
        const visible = computeVisibleCommunityPosts({
            posts: [older, newer],
            mutedIds: new Set(),
            currentUserId: 'me',
            forumFeedScope: 'all',
            followingIds: new Set(),
            selectedFilterIndex: 0,
            filterLabels: ['الكل'],
        });
        expect(visible.map((p) => p.id)).toEqual(['dup']);
        expect(visible[0]?.content).toBe('نص محدّث');
    });
});

describe('trimCommunityPostsRetention', () => {
    const post = (id: string, pinned = false): CommunityPost => ({
        id,
        authorId: 'u1',
        authorName: 'محامٍ',
        content: `منشور ${id}`,
        tags: [],
        createdAt: `2026-01-${id.padStart(2, '0')}T00:00:00.000Z`,
        updatedAt: `2026-01-${id.padStart(2, '0')}T00:00:00.000Z`,
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        ...(pinned ? { isPinned: true } : {}),
    });

    it('يحافظ على المثبّتة عند الاقتصاص', () => {
        const posts = [post('1'), post('pin', true), post('2'), post('3')];
        const trimmed = trimCommunityPostsRetention(posts, 2);
        expect(trimmed.some((p) => p.id === 'pin')).toBe(true);
        expect(trimmed).toHaveLength(2);
    });

    it('لا يغيّر القائمة إذا كانت ضمن الحد', () => {
        const posts = [post('1'), post('2')];
        expect(trimCommunityPostsRetention(posts, 5)).toEqual(posts);
    });
});
