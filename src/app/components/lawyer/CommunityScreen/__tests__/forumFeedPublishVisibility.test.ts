import { describe, expect, it } from 'vitest';
import { shouldShowForumFeedPublishFab } from '../forumFeedPublishVisibility';

describe('shouldShowForumFeedPublishFab', () => {
    it('يظهر في قسم التغذية', () => {
        expect(shouldShowForumFeedPublishFab('forum', null)).toBe(true);
        expect(shouldShowForumFeedPublishFab('forum', 'g1')).toBe(true);
    });

    it('يظهر داخل مجموعة فقط', () => {
        expect(shouldShowForumFeedPublishFab('groups', null)).toBe(false);
        expect(shouldShowForumFeedPublishFab('groups', '')).toBe(false);
        expect(shouldShowForumFeedPublishFab('groups', 'g1')).toBe(true);
    });

    it('لا يظهر في المستودع', () => {
        expect(shouldShowForumFeedPublishFab('repository', null)).toBe(false);
        expect(shouldShowForumFeedPublishFab('repository', 'g1')).toBe(false);
    });
});
