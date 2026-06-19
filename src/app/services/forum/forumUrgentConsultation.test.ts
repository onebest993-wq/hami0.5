import { describe, expect, it } from 'vitest';
import {
    compareCommunityPostsForFeed,
    isActiveUrgentConsultation,
    URGENT_CONSULTATION_WINDOW_MS,
} from '@/app/services/forum/forumUrgentConsultation';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function post(partial: Partial<CommunityPost> & Pick<CommunityPost, 'id' | 'createdAt'>): CommunityPost {
    return {
        authorId: 'u1',
        authorName: 'محامي',
        content: 'نص',
        tags: [],
        updatedAt: partial.createdAt,
        attachment: null,
        upvoterIds: [],
        comments: [],
        ...partial,
    };
}

describe('forumUrgentConsultation', () => {
    it('treats urgent posts as active within 24 hours', () => {
        const now = Date.parse('2026-06-20T12:00:00.000Z');
        const recent = post({
            id: '1',
            createdAt: '2026-06-20T10:00:00.000Z',
            isUrgent: true,
        });
        expect(isActiveUrgentConsultation(recent, now)).toBe(true);
    });

    it('expires urgent priority after 24 hours', () => {
        const now = Date.parse('2026-06-21T13:00:00.000Z');
        const old = post({
            id: '2',
            createdAt: '2026-06-20T12:00:00.000Z',
            isUrgent: true,
        });
        expect(now - Date.parse(old.createdAt)).toBeGreaterThan(URGENT_CONSULTATION_WINDOW_MS);
        expect(isActiveUrgentConsultation(old, now)).toBe(false);
    });

    it('ranks active urgent posts before normal posts', () => {
        const now = Date.parse('2026-06-20T12:00:00.000Z');
        const urgent = post({
            id: 'u',
            createdAt: '2026-06-20T11:00:00.000Z',
            isUrgent: true,
        });
        const normal = post({
            id: 'n',
            createdAt: '2026-06-20T11:30:00.000Z',
        });
        expect(compareCommunityPostsForFeed(urgent, normal, now)).toBeLessThan(0);
    });

    it('does not boost expired urgent posts', () => {
        const now = Date.parse('2026-06-22T12:00:00.000Z');
        const expired = post({
            id: 'e',
            createdAt: '2026-06-20T10:00:00.000Z',
            isUrgent: true,
        });
        const normal = post({
            id: 'n',
            createdAt: '2026-06-21T10:00:00.000Z',
        });
        expect(compareCommunityPostsForFeed(expired, normal, now)).toBeGreaterThan(0);
    });
});
