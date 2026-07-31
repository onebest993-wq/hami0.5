import { describe, expect, it } from 'vitest';
import { forumNotificationSnippet } from '@/app/services/forum/forumNotificationDispatchPush';

describe('forumNotificationDispatchPush', () => {
    it('forumNotificationSnippet يقصّ النص الطويل', () => {
        const long = 'أ'.repeat(60);
        expect(forumNotificationSnippet(long, 48)).toHaveLength(49);
        expect(forumNotificationSnippet('قصير')).toBe('قصير');
    });
});
