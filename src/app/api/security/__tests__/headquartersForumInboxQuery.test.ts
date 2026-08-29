import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    listHeadquartersBannedUsers,
    listHeadquartersPendingReports,
} from '../headquartersForumInboxQuery.ts';

describe('listHeadquartersPendingReports', () => {
    it('يجمع البلاغات المعلقة ومقتطف المنشور دون CommunityDB', async () => {
        const admin = {
            from(table: string) {
                if (table === 'forum_reports') {
                    return {
                        select: () => ({
                            eq: () => ({
                                order: () => ({
                                    limit: async () => ({
                                        data: [
                                            {
                                                id: 'rep-1',
                                                post_id: 'post-1',
                                                reporter_id: 'u-1',
                                                reason: 'إساءة',
                                                created_at: '2026-08-01T00:00:00.000Z',
                                                status: 'pending',
                                            },
                                        ],
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return {
                    select: () => ({
                        in: async () => ({
                            data: [{ id: 'post-1', author_name: 'محامي', content: 'نص المنشور' }],
                            error: null,
                        }),
                    }),
                };
            },
        } as unknown as SupabaseClient;

        const listed = await listHeadquartersPendingReports(admin);
        expect(listed).toEqual([
            expect.objectContaining({
                id: 'rep-1',
                postId: 'post-1',
                reason: 'إساءة',
                post: expect.objectContaining({
                    id: 'post-1',
                    title: 'نص المنشور',
                    content: 'نص المنشور',
                }),
            }),
        ]);
        expect(listed[0]).not.toHaveProperty('reporterId');
    });

    it('يرمي عند فشل قراءة البلاغات', async () => {
        const admin = {
            from() {
                return {
                    select: () => ({
                        eq: () => ({
                            order: () => ({
                                limit: async () => ({ data: null, error: { message: 'boom' } }),
                            }),
                        }),
                    }),
                };
            },
        } as unknown as SupabaseClient;
        await expect(listHeadquartersPendingReports(admin)).rejects.toThrow('boom');
    });
});

describe('listHeadquartersBannedUsers', () => {
    it('يعيد صفوف الحظر الساري بعد تطهير الحقول', async () => {
        const admin = {
            from() {
                return {
                    select: () => ({
                        or: () => ({
                            order: () => ({
                                limit: async () => ({
                                    data: [
                                        {
                                            user_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee09',
                                            user_name: 'محظور\u0000',
                                            reason: 'إساءة',
                                            banned_at: '2026-08-01T00:00:00.000Z',
                                            expires_at: null,
                                        },
                                        {
                                            user_id: 'not-a-uuid',
                                            user_name: 'يتيم',
                                            reason: 'x',
                                            banned_at: '2026-08-01T00:00:00.000Z',
                                            expires_at: null,
                                        },
                                    ],
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                };
            },
        } as unknown as SupabaseClient;
        await expect(listHeadquartersBannedUsers(admin)).resolves.toEqual([
            {
                userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee09',
                userName: 'محظور',
                reason: 'إساءة',
                bannedAt: '2026-08-01T00:00:00.000Z',
                expiresAt: undefined,
            },
        ]);
    });
});

describe('mutations', () => {
    it('يحذف الحظر بالمعرّف ويعيد ok', async () => {
        const { deleteHeadquartersForumBan } = await import('../headquartersForumInboxQuery.ts');
        const select = vi.fn(async () => ({ data: [{ user_id: 'u-9' }], error: null }));
        const admin = {
            from() {
                return { delete: () => ({ eq: () => ({ select }) }) };
            },
        } as unknown as SupabaseClient;
        await expect(deleteHeadquartersForumBan(admin, 'u-9')).resolves.toBe('ok');
        expect(select).toHaveBeenCalledWith('user_id');
    });

    it('يعيد missing إذا لم يُحذف صف', async () => {
        const { deleteHeadquartersForumBan } = await import('../headquartersForumInboxQuery.ts');
        const admin = {
            from() {
                return {
                    delete: () => ({
                        eq: () => ({
                            select: async () => ({ data: [], error: null }),
                        }),
                    }),
                };
            },
        } as unknown as SupabaseClient;
        await expect(deleteHeadquartersForumBan(admin, 'u-9')).resolves.toBe('missing');
    });
});

describe('listHeadquartersPendingCommentReports', () => {
    it('يجمع بلاغات التعليقات مع المقتطف', async () => {
        const { listHeadquartersPendingCommentReports } = await import('../headquartersForumInboxQuery.ts');
        const admin = {
            from(table: string) {
                if (table === 'forum_comment_reports') {
                    return {
                        select: () => ({
                            eq: () => ({
                                order: () => ({
                                    limit: async () => ({
                                        data: [
                                            {
                                                id: 'crep-1',
                                                comment_id: 'c-1',
                                                reporter_id: 'u-2',
                                                reason: 'إساءة',
                                                created_at: '2026-08-01T00:00:00.000Z',
                                                status: 'pending',
                                            },
                                        ],
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return {
                    select: () => ({
                        in: async () => ({
                            data: [{ id: 'c-1', post_id: 'post-1', content: 'نص التعليق' }],
                            error: null,
                        }),
                    }),
                };
            },
        } as unknown as SupabaseClient;
        await expect(listHeadquartersPendingCommentReports(admin)).resolves.toEqual([
            expect.objectContaining({
                id: 'crep-1',
                commentId: 'c-1',
                postId: 'post-1',
                snippet: 'نص التعليق',
            }),
        ]);
    });

    it('جدول بلاغات التعليقات المفقود يعيد قائمة فارغة', async () => {
        const { listHeadquartersPendingCommentReports } = await import('../headquartersForumInboxQuery.ts');
        const admin = {
            from() {
                return {
                    select: () => ({
                        eq: () => ({
                            order: () => ({
                                limit: async () => ({
                                    data: null,
                                    error: { message: 'relation "forum_comment_reports" does not exist' },
                                }),
                            }),
                        }),
                    }),
                };
            },
        } as unknown as SupabaseClient;
        await expect(listHeadquartersPendingCommentReports(admin)).resolves.toEqual([]);
    });
});
