import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('أداء المنتدى — أقفال عدم التراجع', () => {
    it('الاستطلاع الصامت صفحة واحدة ولا يكتب IDB بلا تغيير', () => {
        const paging = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedPaging.ts',
        );
        expect(paging).toContain('const limit = silent ? pageSize');
        expect(paging).toContain('areCommunityPostListsEquivalent');
        expect(paging).toContain('silentInflightRef');

        const api = read('src/app/services/forumApiService.ts');
        expect(api).toContain('shouldPersistMergedForumPosts');
        expect(read('src/app/services/forum/forumApi/forumApiClientCore.ts')).toContain(
            'shouldPersistMergedForumPosts',
        );
        expect(read('src/app/services/forum/forumApi/forumApiClientCore.ts')).toContain(
            'p.bestCommentId ??',
        );
    });

    it('التنبيهات تستخدم سياسة الاستطلاع ولا تدور الجرس في الخلفية', () => {
        const notif = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useForumAppBarNotifications.ts',
        );
        expect(notif).toContain('resolveForumUnreadPollMs');
        expect(notif).not.toContain('5_000');
        expect(read('src/app/components/lawyer/CommunityScreen/communityFeedPolicy.ts')).toContain(
            'COMMUNITY_FORUM_POLL_MS_DEFAULT',
        );
        expect(read('src/app/components/lawyer/CommunityScreen/communityFeedPolicy.ts')).not.toContain(
            'if (streamRunning) return 0',
        );
        expect(read('src/app/hooks/useForumUnreadCount.ts')).toContain('!surfaceLive');
        expect(notif).toContain('if (warmed.timedOut || warmed.notifications.length === 0)');
        expect(notif.split(/\r?\n/).length).toBeLessThan(170);

        const fetch = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useForumNotificationFetch.ts',
        );
        expect(fetch).toContain('if (!options?.background)');
        expect(fetch).toContain('sameSlice');
    });

    it('جلب القائمة لا يعيد إطلاق refresh حتى لا تتشكّل حلقة شبكة', () => {
        const apiNotif = read('src/app/services/forum/forumApi/forumApiNotifications.ts');
        expect(apiNotif).toContain('emitForumUnreadCount(unreadCount)');
        expect(apiNotif).not.toContain('emitForumUnreadCount(unreadCount, { refresh: true })');
        expect(apiNotif).toContain('emitForumUnreadCount(remaining, { refresh: true })');

        const homeUnread = read('src/app/hooks/useForumUnreadCount.ts');
        expect(homeUnread).toContain('if (typeof detail?.count === \'number\') setCount(detail.count)');
        expect(homeUnread).not.toContain('if (detail?.refresh) void refresh');
    });

    it('نافذة الخلاصة لا تعيد إنشاء المراقب عند كل توسعة', () => {
        const expanding = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useExpandingVisibleCount.ts',
        );
        expect(expanding).toContain('[hasMore, step, total, rootMargin]');
        expect(expanding).not.toContain('visibleCount, rootMargin');
    });

    it('تعليقات المنشور لا تعيد الاشتراك عند كل رسم', () => {
        const live = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useForumPostCommentsLive.ts',
        );
        expect(live).toContain('onPostUpdateRef');
        expect(live).toContain('[enabled, postId]');
        expect(live).not.toContain('[enabled, onPostUpdate, postId]');
        expect(read('src/lib/forumService.js')).toContain('document.hidden');
    });
});
