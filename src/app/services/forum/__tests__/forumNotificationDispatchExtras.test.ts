/** خادم فقط — بدون jsdom حتى لا يُسقط guard الـ window في forumReportModeratorNotify */
/** @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockDb = {
    getNotifications: vi.fn(async () => []),
    addNotification: vi.fn(async () => undefined),
    updateNotification: vi.fn(async () => undefined),
};

vi.mock('@/app/services/notifications/forumNotificationDbResolver', () => ({
    resolveForumNotificationDb: vi.fn(async () => mockDb),
}));

vi.mock('@/app/services/forum/forumModeratorIds', () => ({
    listForumModeratorUserIds: vi.fn(async () => ['mod-1']),
}));

import {
    dispatchCommentUpvoteNotification,
    dispatchBestAnswerNotification,
    dispatchReportOutcomeNotification,
} from '@/app/services/forum/forumNotificationDispatch';
import { dispatchForumReportSubmitted } from '@/app/services/forum/forumReportModeratorNotify.server';
import { ANONYMOUS_USER_NAME } from '@/app/services/forum/forumMapper';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

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
        expect(mockDb.addNotification).toHaveBeenCalledTimes(1);
        const call = mockDb.addNotification.mock.calls[0]?.[0];
        expect(call?.userId).toBe('author-1');
        expect(call?.type).toBe('upvote');
    });

    it('notifies moderators on new report', async () => {
        await dispatchForumReportSubmitted({
            postId: 'p1',
            reporterId: 'rep-1',
            reason: 'محتوى مخالف',
        });
        expect(mockDb.addNotification).toHaveBeenCalledTimes(1);
        const call = mockDb.addNotification.mock.calls[0]?.[0];
        expect(call?.userId).toBe('mod-1');
        expect(call?.type).toBe('report_update');
    });

    it('notifies reporter on outcome', async () => {
        await dispatchReportOutcomeNotification({
            reporterId: 'rep-1',
            postId: 'p1',
            outcome: 'dismissed',
        });
        expect(mockDb.addNotification).toHaveBeenCalledTimes(1);
        const call = mockDb.addNotification.mock.calls[0]?.[0];
        expect(call?.userId).toBe('rep-1');
    });

    it('masks anonymous author in best answer notification', async () => {
        const post: CommunityPost = {
            id: 'p1',
            authorId: 'real-author',
            authorName: 'اسم حقيقي',
            content: 'سؤال',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachment: null,
            upvoterIds: [],
            comments: [],
            bestCommentId: null,
            isAnonymous: true,
        };
        await dispatchBestAnswerNotification({
            post,
            comment: {
                id: 'c1',
                postId: 'p1',
                authorId: 'commenter',
                authorName: 'معلّق',
                content: 'إجابة',
                createdAt: new Date().toISOString(),
            },
        });
        const call = mockDb.addNotification.mock.calls[0]?.[0];
        expect(call?.message).toContain(ANONYMOUS_USER_NAME);
        expect(call?.message).not.toContain('اسم حقيقي');
    });
});
