import { describe, expect, it } from 'vitest';
import { forumIlikeContainsPattern } from '@/app/services/forum/forumIlikePattern';
import {
    filterLocalForumPostsForSearch,
    hasForumCommunitySearchFilters,
    mergeSearchHitsById,
} from '@/app/components/lawyer/CommunityScreen/forumCommunitySearchFilter';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function post(id: string, content: string): CommunityPost {
    return {
        id,
        authorId: 'a',
        authorName: 'محامي',
        content,
        tags: ['#مدني'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachment: null,
        upvoterIds: [],
        comments: [],
    };
}

describe('forumIlikeContainsPattern', () => {
    it('يطوي الهمزة ويمنع محارف ILIKE', () => {
        expect(forumIlikeContainsPattern('أحمد%')).toBe('%احمد%');
        expect(forumIlikeContainsPattern('')).toBeNull();
    });
});

describe('forumCommunitySearchFilter', () => {
    it('يميز الفلاتر النشطة', () => {
        expect(hasForumCommunitySearchFilters({ q: '', hasPdf: false, hasImage: false, tag: null })).toBe(
            false,
        );
        expect(hasForumCommunitySearchFilters({ q: 'عقد', hasPdf: false, hasImage: false, tag: null })).toBe(
            true,
        );
    });

    it('يستثني منشورات المجموعات من البحث العام', () => {
        const grouped: CommunityPost = { ...post('g', 'عقد إيجار'), groupId: 'grp-1' };
        const hits = filterLocalForumPostsForSearch([post('1', 'عقد إيجار'), grouped], {
            q: 'ايجار',
            hasPdf: false,
            hasImage: false,
            tag: null,
        });
        expect(hits.map((p) => p.id)).toEqual(['1']);
    });

    it('يصفي المنشورات المحلية وفق النص', () => {
        const hits = filterLocalForumPostsForSearch([post('1', 'عقد إيجار'), post('2', 'طلاق')], {
            q: 'ايجار',
            hasPdf: false,
            hasImage: false,
            tag: null,
        });
        expect(hits.map((p) => p.id)).toEqual(['1']);
    });

    it('يدمج نتائج الخادم فوق المحلية', () => {
        const merged = mergeSearchHitsById(
            [{ id: '1', content: 'من الخادم' }],
            [{ id: '1', content: 'محلي' }, { id: '2', content: 'قديم' }],
        );
        expect(merged).toEqual([
            { id: '1', content: 'من الخادم' },
            { id: '2', content: 'قديم' },
        ]);
    });
});
