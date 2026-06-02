/**
 * اختبارات الدوال الجديدة في ForumRepository:
 * toggleBookmark / listBookmarkedPostIds / toggleCommentUpvote /
 * toggleLockDiscussion / reportComment / editComment (best answer lock) /
 * addComment (locked post block)
 *
 * الاستراتيجية: نُحاكي supabase admin client بـ chain شامل، ونتحقق
 * من الـ inserts/deletes/queries المرسلة + من رمي الأخطاء المتوقعة.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ============== Supabase chain mock ==============
type QueryRecorder = {
    table: string | null;
    selectArg?: string;
    eqs: Array<[string, unknown]>;
    inserts: Array<unknown>;
    updates: Array<unknown>;
    deletes: boolean;
    nextSingle: { data: unknown; error: unknown };
    nextMaybeSingle: { data: unknown; error: unknown };
    nextListResult: { data: unknown[]; error: unknown };
};

const recorder: QueryRecorder = {
    table: null,
    eqs: [],
    inserts: [],
    updates: [],
    deletes: false,
    nextSingle: { data: null, error: null },
    nextMaybeSingle: { data: null, error: null },
    nextListResult: { data: [], error: null },
};

function resetRecorder() {
    recorder.table = null;
    recorder.selectArg = undefined;
    recorder.eqs = [];
    recorder.inserts = [];
    recorder.updates = [];
    recorder.deletes = false;
    recorder.nextSingle = { data: null, error: null };
    recorder.nextMaybeSingle = { data: null, error: null };
    recorder.nextListResult = { data: [], error: null };
}

function buildChain() {
    const chain: Record<string, unknown> = {};
    chain.select = (arg?: string) => {
        recorder.selectArg = arg;
        return chain;
    };
    chain.insert = (val: unknown) => {
        recorder.inserts.push(val);
        return Promise.resolve({ data: null, error: recorder.nextListResult.error });
    };
    chain.update = (val: unknown) => {
        recorder.updates.push(val);
        return chain;
    };
    chain.delete = () => {
        recorder.deletes = true;
        return chain;
    };
    chain.eq = (col: string, v: unknown) => {
        recorder.eqs.push([col, v]);
        return chain;
    };
    chain.in = () => chain;
    chain.order = () => chain;
    chain.maybeSingle = () => Promise.resolve(recorder.nextMaybeSingle);
    chain.single = () => Promise.resolve(recorder.nextSingle);
    // thenable للسماح بـ await chain
    chain.then = (resolve: (v: unknown) => unknown) =>
        resolve(recorder.nextListResult);
    return chain;
}

// ============== Mocks ==============
vi.mock('../supabaseAdmin', () => ({
    getForumSupabaseAdmin: vi.fn(() => ({
        from: (table: string) => {
            recorder.table = table;
            return buildChain();
        },
    })),
    isForumSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/app/services/lawyer-cloud', () => ({
    BanDB: { isBanned: vi.fn(), listBannedUsers: vi.fn(() => []) },
    NotificationDB: { addNotification: vi.fn() },
    CommunityDB: { deletePost: vi.fn() },
    addCommunityComment: vi.fn(),
    getCommunityPosts: vi.fn(async () => []),
    getCommunityPostById: vi.fn(async () => null),
}));

import { ForumRepository } from '../forumRepository';

beforeEach(() => {
    resetRecorder();
});

// ============== toggleBookmark ==============
describe('toggleBookmark', () => {
    it('يُضيف bookmark جديد لو لم يكن موجوداً', async () => {
        recorder.nextMaybeSingle = { data: null, error: null };
        recorder.nextListResult = { data: [], error: null };
        const result = await ForumRepository.toggleBookmark('post-1', 'user-1');
        expect(result.bookmarked).toBe(true);
        const insert = recorder.inserts[0] as Record<string, unknown>;
        expect(insert.user_id).toBe('user-1');
        expect(insert.post_id).toBe('post-1');
    });

    it('يحذف bookmark موجوداً', async () => {
        recorder.nextMaybeSingle = { data: { post_id: 'post-1' }, error: null };
        const result = await ForumRepository.toggleBookmark('post-1', 'user-1');
        expect(result.bookmarked).toBe(false);
        expect(recorder.deletes).toBe(true);
    });
});

// ============== listBookmarkedPostIds ==============
describe('listBookmarkedPostIds', () => {
    it('يُعيد قائمة postIds للمستخدم', async () => {
        recorder.nextListResult = {
            data: [{ post_id: 'p1' }, { post_id: 'p2' }],
            error: null,
        };
        const ids = await ForumRepository.listBookmarkedPostIds('user-1');
        expect(ids).toEqual(['p1', 'p2']);
    });

    it('يُعيد مصفوفة فارغة عند فشل الاستعلام', async () => {
        recorder.nextListResult = { data: [], error: { message: 'fail' } };
        const ids = await ForumRepository.listBookmarkedPostIds('user-1');
        expect(ids).toEqual([]);
    });
});

// ============== toggleCommentUpvote ==============
describe('toggleCommentUpvote', () => {
    it('يرفض التصويت على تعليق غير موجود', async () => {
        recorder.nextMaybeSingle = { data: null, error: null };
        await expect(
            ForumRepository.toggleCommentUpvote('c-missing', 'user-1'),
        ).rejects.toThrow('التعليق غير موجود');
    });

    it('يمنع التصويت على تعليق ذاتي', async () => {
        recorder.nextMaybeSingle = { data: { author_id: 'user-1' }, error: null };
        await expect(
            ForumRepository.toggleCommentUpvote('c-1', 'user-1'),
        ).rejects.toThrow('لا يمكنك التصويت على تعليقك');
    });
});

// ============== toggleLockDiscussion ==============
describe('toggleLockDiscussion', () => {
    it('يرفض غير مالك ولا أدمن', async () => {
        // getPostById يستخدم maybeSingle() لذا نُحاكي البيانات هناك
        recorder.nextMaybeSingle = {
            data: {
                id: 'p1',
                author_id: 'owner',
                author_name: 'owner-name',
                content: '',
                tags: [],
                attachment: null,
                upvoter_ids: [],
                best_comment_id: null,
                is_urgent: false,
                is_anonymous: false,
                is_edited: false,
                is_pinned: false,
                is_locked: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            error: null,
        };
        recorder.nextListResult = { data: [], error: null };
        await expect(
            ForumRepository.toggleLockDiscussion('p1', true, 'stranger', false),
        ).rejects.toThrow('صلاحية');
    });

    it('يُرسل update is_locked=true للمالك', async () => {
        recorder.nextMaybeSingle = {
            data: {
                id: 'p1',
                author_id: 'owner',
                author_name: 'owner-name',
                content: '',
                tags: [],
                attachment: null,
                upvoter_ids: [],
                best_comment_id: null,
                is_urgent: false,
                is_anonymous: false,
                is_edited: false,
                is_pinned: false,
                is_locked: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            error: null,
        };
        recorder.nextListResult = { data: [], error: null };
        await ForumRepository.toggleLockDiscussion('p1', true, 'owner', false);
        // نتحقق أن الـ update تم بقيمة is_locked=true (السلوك المرغوب)
        const updateCall = recorder.updates[0] as Record<string, unknown> | undefined;
        expect(updateCall?.is_locked).toBe(true);
    });

    it('يسمح للأدمن بقفل أي منشور', async () => {
        recorder.nextMaybeSingle = {
            data: {
                id: 'p1',
                author_id: 'someone-else',
                author_name: 'owner-name',
                content: '',
                tags: [],
                attachment: null,
                upvoter_ids: [],
                best_comment_id: null,
                is_urgent: false,
                is_anonymous: false,
                is_edited: false,
                is_pinned: false,
                is_locked: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            error: null,
        };
        recorder.nextListResult = { data: [], error: null };
        await ForumRepository.toggleLockDiscussion('p1', true, 'admin-id', true);
        expect(recorder.updates[0]).toBeDefined();
    });
});

// ============== editComment best-answer lock ==============
describe('editComment — قفل أفضل إجابة', () => {
    it('يرفض تعديل تعليق مُميَّز كأفضل إجابة', async () => {
        // post لديه bestCommentId = c1 وعليه يجب أن يفشل تعديله
        recorder.nextMaybeSingle = {
            data: {
                id: 'p1',
                author_id: 'post-owner',
                author_name: 'owner',
                content: '',
                tags: [],
                attachment: null,
                upvoter_ids: [],
                best_comment_id: 'c1',
                is_urgent: false,
                is_anonymous: false,
                is_edited: false,
                is_pinned: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            error: null,
        };
        recorder.nextListResult = {
            data: [{
                id: 'c1',
                post_id: 'p1',
                author_id: 'commenter',
                author_name: 'C',
                content: 'إجابة',
                parent_id: null,
                created_at: new Date().toISOString(),
            }],
            error: null,
        };
        await expect(
            ForumRepository.editComment('p1', 'c1', 'محتوى محدّث', 'commenter'),
        ).rejects.toThrow('أفضل إجابة');
    });
});

// ============== addComment — منع التعليق على منشور مقفل ==============
describe('addComment — قفل النقاش', () => {
    it('يرفض التعليق لو المنشور مقفل', async () => {
        recorder.nextMaybeSingle = {
            data: {
                id: 'p1',
                author_id: 'owner',
                author_name: 'owner',
                content: '',
                tags: [],
                attachment: null,
                upvoter_ids: [],
                best_comment_id: null,
                is_urgent: false,
                is_anonymous: false,
                is_edited: false,
                is_pinned: false,
                is_locked: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            error: null,
        };
        recorder.nextListResult = { data: [], error: null };
        await expect(
            ForumRepository.addComment('p1', {
                id: 'c-new',
                postId: 'p1',
                authorId: 'commenter',
                authorName: 'C',
                content: 'محاولة',
                createdAt: new Date().toISOString(),
            }),
        ).rejects.toThrow('مقفل');
    });
});

// ============== reportComment ==============
describe('reportComment', () => {
    it('يُسجّل duplicate لو نفس المُبلّغ سبق له الإبلاغ pending', async () => {
        recorder.nextMaybeSingle = { data: { id: 'r-1' }, error: null };
        const r = await ForumRepository.reportComment('c-1', 'spam', 'reporter');
        expect(r.duplicate).toBe(true);
    });

    it('ينشئ بلاغاً جديداً عند عدم وجود سابق', async () => {
        recorder.nextMaybeSingle = { data: null, error: null };
        recorder.nextListResult = { data: [], error: null };
        const r = await ForumRepository.reportComment('c-1', 'spam', 'reporter');
        expect(r.ok).toBe(true);
        const insert = recorder.inserts[0] as Record<string, unknown>;
        expect(insert.comment_id).toBe('c-1');
        expect(insert.reporter_id).toBe('reporter');
        expect(insert.reason).toBe('spam');
        expect(insert.status).toBe('pending');
    });
});
