import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadAdminMock = vi.fn();

vi.mock('../loadForumSupabaseAdmin', () => ({
    loadForumSupabaseAdmin: (...a: unknown[]) => loadAdminMock(...a),
}));

import { loadForumOfficialStats } from '../forumOfficialStats';

function thenableCount(n: number) {
    const chain: Record<string, unknown> = {};
    chain.is = () => chain;
    chain.eq = () => chain;
    chain.not = () => chain;
    chain.gt = () => chain;
    chain.then = (resolve: (value: unknown) => unknown) => resolve({ count: n, error: null });
    return chain;
}

describe('loadForumOfficialStats', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يعيد null بلا عميل إدارة — ليس أصفاراً كواقع', async () => {
        loadAdminMock.mockResolvedValue(null);
        await expect(loadForumOfficialStats()).resolves.toBeNull();
    });

    it('يجمع من Postgres بما فيها المرفقات والحظر الساري', async () => {
        loadAdminMock.mockResolvedValue({
            from(table: string) {
                return {
                    select(cols: string, opts?: { head?: boolean }) {
                        if (opts?.head) {
                            if (table === 'forum_posts') return thenableCount(4);
                            if (table === 'forum_reports') return thenableCount(2);
                            if (table === 'forum_bans') {
                                return {
                                    is: () => thenableCount(1),
                                    gt: () => thenableCount(2),
                                    eq: () => thenableCount(0),
                                    not: () => thenableCount(0),
                                };
                            }
                            if (table === 'forum_comments') return thenableCount(5);
                            return thenableCount(7);
                        }
                        return {
                            is: () => ({
                                limit: async () => ({
                                    data: [{ tags: ['تنفيذ'], upvoter_ids: ['u1', 'u2'] }],
                                    error: null,
                                }),
                            }),
                        };
                    },
                };
            },
        });

        const stats = await loadForumOfficialStats();
        expect(stats?.totalPosts).toBe(4);
        expect(stats?.totalComments).toBe(5);
        expect(stats?.totalDocuments).toBe(4);
        expect(stats?.totalBannedUsers).toBe(3);
        expect(stats?.totalUpvotes).toBe(9);
        expect(stats?.topTags).toEqual([{ tag: 'تنفيذ', count: 1 }]);
    });

    it('يرمي عند فشل العدّ ولا يعيد أصفاراً', async () => {
        loadAdminMock.mockResolvedValue({
            from() {
                return {
                    select(_cols: string, opts?: { head?: boolean }) {
                        if (opts?.head) {
                            const chain: Record<string, unknown> = {};
                            chain.is = () => chain;
                            chain.eq = () => chain;
                            chain.not = () => chain;
                            chain.gt = () => chain;
                            chain.then = (resolve: (value: unknown) => unknown) =>
                                resolve({ count: null, error: { message: 'boom' } });
                            return chain;
                        }
                        return {
                            is: () => ({
                                limit: async () => ({ data: [], error: null }),
                            }),
                        };
                    },
                };
            },
        });
        await expect(loadForumOfficialStats()).rejects.toThrow('forum stats count failed');
    });

    it('عدّ HEAD لا يطلب عمود id — forum_bans مفتاحه user_id', () => {
        const src = readFileSync(join(process.cwd(), 'src/app/services/forum/forumOfficialStats.ts'), 'utf8');
        expect(src).toContain(".select('*', { count: 'exact', head: true })");
        expect(src).not.toContain(".select('id', { count: 'exact', head: true })");
    });
});
