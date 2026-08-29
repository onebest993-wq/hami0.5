import { describe, expect, it } from 'vitest';
import {
    clipHqForumInboxField,
    deriveHqForumPostTitle,
    mapHqForumPostSnippet,
    uniqueHqForumReportNotices,
} from '../hqForumInboxMap.ts';

describe('hqForumInboxMap', () => {
    it('يشتق العنوان من أول سطر ويحذف أحرف التحكم', () => {
        expect(deriveHqForumPostTitle('عنوان المنشور\nبقية النص')).toBe('عنوان المنشور');
        expect(clipHqForumInboxField(`سبب\u0000سيئ${'x'.repeat(400)}`, 240).includes('\u0000')).toBe(false);
        expect(clipHqForumInboxField(`سبب\u0000سيئ${'x'.repeat(400)}`, 240).length).toBeLessThanOrEqual(240);
    });

    it('يبني مقتطف منشور بعنوان من المحتوى', () => {
        const snippet = mapHqForumPostSnippet({
            id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee01',
            author_name: 'محامي',
            content: 'استشارة عاجلة حول عقد\nتفاصيل طويلة',
        });
        expect(snippet?.title).toBe('استشارة عاجلة حول عقد');
        expect(snippet?.content.startsWith('استشارة عاجلة')).toBe(true);
        expect(snippet).not.toHaveProperty('authorName');
    });

    it('يزيل تكرار إشعارات المبلِّغين', () => {
        const notices = uniqueHqForumReportNotices([
            { reporterId: 'u1', postId: 'p1' },
            { reporterId: 'u1', postId: 'p1' },
            { reporterId: 'u2', postId: 'p1' },
            { reporterId: '', postId: 'p1' },
        ]);
        expect(notices).toEqual([
            { reporterId: 'u1', postId: 'p1' },
            { reporterId: 'u2', postId: 'p1' },
        ]);
    });
});
