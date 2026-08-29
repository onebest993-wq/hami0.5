import { describe, expect, it } from 'vitest';
import {
    sanitizeHqBannedUserRow,
    sanitizeHqForumDirectoryUser,
    sanitizeHqForumStats,
} from '../hqForumBanRows';

const USER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee09';

describe('hqForumBanRows', () => {
    it('يرفض حظراً بلا UUID ويطهّر النصوص', () => {
        expect(sanitizeHqBannedUserRow({ userId: 'u-1', userName: 'x', reason: 'y' })).toBeNull();
        const row = sanitizeHqBannedUserRow({
            userId: USER,
            userName: `اسم\u0000${'z'.repeat(100)}`,
            reason: 'إساءة',
            bannedAt: '2026-08-01T00:00:00.000Z',
            expiresAt: '2026-08-08T00:00:00.000Z',
        });
        expect(row?.userId).toBe(USER);
        expect(row?.userName.includes('\u0000')).toBe(false);
        expect(row?.userName.length).toBeLessThanOrEqual(80);
        expect(row?.expiresAt).toBe('2026-08-08T00:00:00.000Z');
    });

    it('يحصر أعداد الإحصاءات والوسوم', () => {
        const stats = sanitizeHqForumStats({
            totalPosts: -2,
            totalComments: 1.9,
            totalUpvotes: '3',
            totalReports: 4,
            pendingReports: 5,
            totalDocuments: 6,
            totalBannedUsers: 7,
            topTags: [{ tag: 'تنفيذ\u0000', count: 2 }, { tag: '', count: 1 }],
        });
        expect(stats?.totalPosts).toBe(0);
        expect(stats?.totalComments).toBe(1);
        expect(stats?.topTags).toEqual([{ tag: 'تنفيذ', count: 2 }]);
    });

    it('دليل الحظر يقبل UUID فقط', () => {
        expect(sanitizeHqForumDirectoryUser({ id: 'nope', fullName: 'أ' })).toBeNull();
        expect(sanitizeHqForumDirectoryUser({ id: USER, fullName: 'محامي', email: 'a@b.c' })).toEqual({
            id: USER,
            fullName: 'محامي',
            email: 'a@b.c',
        });
    });
});
