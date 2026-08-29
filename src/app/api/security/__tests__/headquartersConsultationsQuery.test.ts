import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    deleteHeadquartersConsultation,
    listHeadquartersConsultations,
} from '../headquartersConsultationsQuery.ts';

const POST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee21';

function makeAdmin(handlers: {
    posts?: { data: unknown; error: { message: string } | null };
    comments?: { data: unknown; error: { message: string } | null };
    maybeSingle?: { data: unknown; error: { message: string } | null };
    deleteComments?: { error: { message: string } | null };
    deletePosts?: { error: { message: string } | null };
}): SupabaseClient {
    return {
        from(table: string) {
            if (table === 'forum_posts') {
                return {
                    select(cols: string) {
                        if (cols.includes('group_id')) {
                            return {
                                eq: () => ({
                                    maybeSingle: async () =>
                                        handlers.maybeSingle ?? {
                                            data: { id: POST, group_id: null },
                                            error: null,
                                        },
                                }),
                            };
                        }
                        return {
                            is: () => ({
                                order: () => ({
                                    limit: async () =>
                                        handlers.posts ?? {
                                            data: [
                                                {
                                                    id: POST,
                                                    author_name: 'سائل',
                                                    is_anonymous: false,
                                                    content: 'استشارة',
                                                    created_at: '2026-08-01T00:00:00.000Z',
                                                },
                                            ],
                                            error: null,
                                        },
                                }),
                            }),
                        };
                    },
                    delete: () => ({
                        eq: async () => handlers.deletePosts ?? { error: null },
                    }),
                };
            }
            return {
                select: () => ({
                    in: () => ({
                        limit: async () =>
                            handlers.comments ?? {
                                data: [{ post_id: POST }],
                                error: null,
                            },
                    }),
                }),
                delete: () => ({
                    eq: async () => handlers.deleteComments ?? { error: null },
                }),
            };
        },
    } as unknown as SupabaseClient;
}

describe('listHeadquartersConsultations', () => {
    it('يجمع المنشورات العامة وعدّ الردود دون أسماء المعلّقين', async () => {
        const rows = await listHeadquartersConsultations(makeAdmin({}));
        expect(rows).toEqual([
            expect.objectContaining({
                id: POST,
                name: 'سائل',
                content: 'استشارة',
                replyCount: 1,
                offers: [],
            }),
        ]);
        expect(JSON.stringify(rows)).not.toContain('محامي');
    });

    it('يرمي عند فشل قراءة المنشورات', async () => {
        await expect(
            listHeadquartersConsultations(
                makeAdmin({ posts: { data: null, error: { message: 'boom' } } }),
            ),
        ).rejects.toThrow('boom');
    });

    it('جدول مفقود يعيد قائمة فارغة لا خطأ', async () => {
        await expect(
            listHeadquartersConsultations(
                makeAdmin({
                    posts: { data: null, error: { message: 'relation "forum_posts" does not exist' } },
                }),
            ),
        ).resolves.toEqual([]);
    });
});

describe('deleteHeadquartersConsultation', () => {
    it('يعيد missing إذا الصف غير موجود', async () => {
        const result = await deleteHeadquartersConsultation(
            makeAdmin({ maybeSingle: { data: null, error: null } }),
            POST,
        );
        expect(result).toBe('missing');
    });

    it('يرفض معرّفاً غير UUID بلا قراءة', async () => {
        const result = await deleteHeadquartersConsultation(makeAdmin({}), 'post-1');
        expect(result).toBe('missing');
    });

    it('يرفض منشور مجموعة', async () => {
        const result = await deleteHeadquartersConsultation(
            makeAdmin({ maybeSingle: { data: { id: POST, group_id: 'g-1' }, error: null } }),
            POST,
        );
        expect(result).toBe('missing');
    });

    it('يحذف التعليقات ثم المنشور ويعيد authorId', async () => {
        const deleteComments = vi.fn(async () => ({ error: null }));
        const deletePosts = vi.fn(async () => ({ error: null }));
        const AUTHOR = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
        const admin = {
            from(table: string) {
                if (table === 'forum_posts') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { id: POST, group_id: null, author_id: AUTHOR },
                                    error: null,
                                }),
                            }),
                        }),
                        delete: () => ({ eq: deletePosts }),
                    };
                }
                return { delete: () => ({ eq: deleteComments }) };
            },
        } as unknown as SupabaseClient;
        await expect(deleteHeadquartersConsultation(admin, POST)).resolves.toEqual({
            ok: true,
            authorId: AUTHOR,
        });
        expect(deleteComments).toHaveBeenCalledWith('post_id', POST);
        expect(deletePosts).toHaveBeenCalledWith('id', POST);
    });
});

describe('setHeadquartersPostFlags', () => {
    it('يحدّث التثبيت والقفل دون حذف', async () => {
        const { setHeadquartersPostFlags } = await import('../headquartersConsultationsQuery.ts');
        const eqUpdate = vi.fn(async () => ({ error: null }));
        const admin = {
            from() {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: { id: POST, group_id: null }, error: null }),
                        }),
                    }),
                    update: () => ({ eq: eqUpdate }),
                    delete: () => ({
                        eq: async () => {
                            throw new Error('must not delete');
                        },
                    }),
                };
            },
        } as unknown as SupabaseClient;
        await expect(setHeadquartersPostFlags(admin, POST, { pinned: true })).resolves.toEqual({
            ok: true,
            authorId: '',
        });
        expect(eqUpdate).toHaveBeenCalledWith('id', POST);
    });
});
