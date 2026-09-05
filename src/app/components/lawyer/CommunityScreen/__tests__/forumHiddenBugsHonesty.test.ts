import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('علل المنتدى الخفية — أقفال عدم التراجع', () => {
    it('الدمج يتبع النسخة الأحدث في التثبيت والقفل والتصويت', () => {
        const merge = read('src/app/services/cloud/lawyerCommunityCloud.ts');
        expect(merge).toContain('isPinned: newer.isPinned');
        expect(merge).toContain('isLocked: newer.isLocked');
        expect(merge).toContain('const upvoterIds = newer.upvoterIds ?? []');
        expect(merge).toContain('remoteTime >= localTime');
        expect(merge).toContain('const tags = [...(newer.tags ?? [])]');
        expect(merge).not.toContain('isPinned: local.isPinned || remote.isPinned');
        expect(merge).not.toContain('local.isEdited || remote.isEdited');
        expect(merge).not.toContain('c.content.length >= prev.content.length');
    });

    it('نافذة الخلاصة لا تُصفَّر عند نمو القائمة', () => {
        const expanding = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useExpandingVisibleCount.ts',
        );
        expect(expanding).toContain('if (count <= floor) return floor');
        expect(expanding).toContain('return Math.min(count, total)');
        expect(expanding).not.toContain(
            'setVisibleCount(total <= 0 ? initial : Math.min(initial, total))',
        );
    });

    it('التنبيهات تُجلب بعد مهلة التسخين وتُنبّه من صفر إلى واحد', () => {
        const notif = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useForumAppBarNotifications.ts',
        );
        expect(notif).toContain('setForumSurfaceLive');
        expect(notif).toContain('readForumNotificationsCacheTimed');
        expect(notif).toContain('warmed.timedOut');
        expect(notif.split(/\r?\n/).length).toBeLessThan(170);

        const fetch = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useForumNotificationFetch.ts',
        );
        expect(fetch).toContain('hydratedRef.current && unread > lastUnreadRef.current');
        expect(fetch).not.toContain('lastUnreadRef.current > 0 && unread > lastUnreadRef.current');
        expect(fetch).toContain('n.title === slice[i]?.title');
    });

    it('الاستطلاع الصامت لا يُغلق قفله عند التعليق، والمجموعة لا تعرض منشورات مجموعة أخرى', () => {
        const paging = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedPaging.ts',
        );
        expect(paging).toContain('paginationOffsetRef');
        expect(paging).toContain('acknowledgeServerPage');
        expect(paging).toContain('Math.min(page.length, limit)');
        expect(paging).not.toContain('if (silent && paginationOffsetRef.current === 0)');
        expect(paging).toContain('SILENT_POSTS_TIMEOUT_MS');
        expect(paging).toContain('if (timedOut) return');

        const groups = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityGroupPostsFeed.ts',
        );
        expect(groups).toContain('groupOffsetRef');
        expect(groups).not.toContain('groupPostsRef.current.length');
        expect(groups).toContain('loadedGroupIdRef');
        expect(groups).toContain('loadedGroupIdRef.current !== activeGroupId');

        const feed = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeed.ts',
        );
        expect(feed).toContain('void urgentPriorityTick');
        expect(feed).toContain('const [hasMore, setHasMore] = useState(false)');
        expect(feed.split(/\r?\n/).length).toBeLessThan(200);
    });

    it('معرّف الكيان مصدر واحد، والاستطلاع لا يتكرر مع التيار أو سطح المنتدى', () => {
        expect(read('src/app/components/lawyer/CommunityScreen/forumEntityId.ts')).toContain(
            'createForumEntityId as newForumEntityId',
        );
        expect(read('src/app/services/forum/forumPostCreateGuard.ts')).toContain(
            'export const mintForumEntityId = createForumEntityId',
        );
        expect(read('src/app/runtime/forumSurfaceLive.ts')).toContain('setForumSurfaceLive');
        expect(read('src/app/runtime/forumOpenIntent.ts')).toContain('setForumSurfaceLive');
        expect(read('src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedBootstrap.ts')).toContain(
            'onServerPage?.(page.length)',
        );
        expect(read('src/app/hooks/useForumUnreadCount.ts')).toContain('!surfaceLive');
        expect(read('src/app/components/lawyer/CommunityScreen/hooks/communityPostFeedUtils.ts')).toContain(
            'tags: normalizeCommunityTags(p.tags)',
        );
        expect(read('src/app/services/cloud/lawyerCommunityCloud.ts')).toContain('Boolean(newer.isEdited)');
    });
});
