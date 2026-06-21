import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/services/lawyer-cloud', () => ({
    NotificationDB: {
        getNotifications: vi.fn(async () => []),
        addNotification: vi.fn(async () => undefined),
        updateNotification: vi.fn(async () => undefined),
    },
}));

vi.mock('@/app/services/forum/forumModeratorIds', () => ({
    listForumModeratorUserIds: vi.fn(async () => ['mod-1']),
}));

import { NotificationDB } from '@/app/services/lawyer-cloud';
import {
    dispatchCommentUpvoteNotification,
    dispatchForumReportSubmitted,
    dispatchReportOutcomeNotification,
} from '@/app/services/forum/forumNotificationDispatch';

describe('forumNotificationDispatch extras', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('dispatches comment upvote to author', async () => {
        await dispatchCommentUpvoteNotification({
            postId: 'p1',
            commentAuthorId: 'author-1',
            commentSnippet: 'رد مفيد',
            voterId: 'voter-1',
        });
        expect(NotificationDB.addNotification).toHaveBeenCalledTimes(1);
        const call = vi.mocked(NotificationDB.addNotification).mock.calls[0]?.[0];
        expect(call?.userId).toBe('author-1');
        expect(call?.type).toBe('upvote');
    });

    it('notifies moderators on new report', async () => {
        await dispatchForumReportSubmitted({
            postId: 'p1',
            reporterId: 'rep-1',
            reason: 'محتوى مخالف',
        });
        expect(NotificationDB.addNotification).toHaveBeenCalledTimes(1);
        const call = vi.mocked(NotificationDB.addNotification).mock.calls[0]?.[0];
        expect(call?.userId).toBe('mod-1');
        expect(call?.type).toBe('report_update');
    });

    it('notifies reporter on outcome', async () => {
        await dispatchReportOutcomeNotification({
            reporterId: 'rep-1',
            postId: 'p1',
            outcome: 'dismissed',
        });
        expect(NotificationDB.addNotification).toHaveBeenCalledTimes(1);
        const call = vi.mocked(NotificationDB.addNotification).mock.calls[0]?.[0];
        expect(call?.userId).toBe('rep-1');
    });
});
