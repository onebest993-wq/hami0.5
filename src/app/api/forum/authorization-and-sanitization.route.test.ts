/**
 * اختبارات تحقق الصلاحيات وتعقيم المدخلات لمسارات المنتدى.
 *
 * تتحقق أن:
 *  - المستخدم لا يستطيع حذف/تعديل منشور غيره (يُرفض بـ 403).
 *  - المالك والمشرف يُسمح لهما بالعمليات المشروعة.
 *  - غير عضو المجموعة يُمنع من التفاعل مع منشوراتها.
 *  - حد المعدل يُفعَّل قبل لمس البيانات.
 *  - تعقيم المدخلات يزيل الوسوم غير المسموحة ويحفظ النص العربي.
 *
 * تعتمد منطق التخويل الحقيقي في ForumRepository عبر مسار fallback المحلي.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityPost } from '../../services/forum/forumTypes';

const OWNER_ID = 'owner-user';
const OTHER_ID = 'other-user';

function buildOwnerPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'post-owned',
        authorId: OWNER_ID,
        author_id: OWNER_ID,
        authorName: 'المالك',
        content: 'منشور قانوني مملوك للمالك بمحتوى كافٍ للطول الأدنى',
        tags: [],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        upvotes: 0,
        upvoterIds: [],
        comments: [],
        ...overrides,
    } as CommunityPost;
}

const getPostByIdMock = vi.fn();
const deletePostMock = vi.fn();
const savePostCloudMock = vi.fn();

vi.mock('@/app/services/forum/forumCommunityRuntime', () => ({
    CommunityDB: {
        deletePost: (...args: unknown[]) => deletePostMock(...args),
        savePost: (...args: unknown[]) => savePostCloudMock(...args),
    },
    getCommunityPostById: (...args: unknown[]) => getPostByIdMock(...args),
    getCommunityPosts: vi.fn(async () => []),
    addCommunityComment: vi.fn(),
}));

// بلا Supabase admin — نستخدم مسار fallback المحلي حيث يوجد منطق التخويل الحقيقي
vi.mock('../../services/forum/loadForumSupabaseAdmin', () => ({
    loadForumSupabaseAdmin: async () => null,
    isForumSupabaseConfigured: () => false,
}));

const isMemberMock = vi.fn();
vi.mock('../../services/forum/forumGroupRepository', () => ({
    ForumGroupRepository: {
        isMember: (...args: unknown[]) => isMemberMock(...args),
        listMemberIds: vi.fn(async () => []),
        getGroup: vi.fn(async () => null),
    },
}));

const rateLimitMock = vi.fn();
vi.mock('../../services/forum/forumRateLimitServer.ts', () => ({
    checkForumActionRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

const authIdentityMock = vi.fn();
vi.mock('./_auth.ts', () => ({
    requireForumAuth: (...args: unknown[]) => authIdentityMock(...args),
    requireForumAuthAndUnbanned: (...args: unknown[]) => authIdentityMock(...args),
    assertForumWriteAllowed: () => ({ ok: true }),
    jsonResponse: (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
}));

import { POST as deleteRoute } from './delete/route.ts';
import { POST as updateRoute } from './update/route.ts';
import { sanitizePayload } from '../security/sanitizer.ts';

function jsonRequest(url: string, body: Record<string, unknown>): Request {
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function actAs(userId: string, isAdmin = false): void {
    authIdentityMock.mockResolvedValue({ ok: true, userId, token: 'tok', isAdmin });
}

beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMock.mockResolvedValue(true);
    isMemberMock.mockResolvedValue(true);
    getPostByIdMock.mockResolvedValue(buildOwnerPost());
    actAs(OTHER_ID);
});

describe('صلاحية حذف المنشور', () => {
    it('يرفض حذف مستخدم لمنشور غيره بـ 403 دون المساس بالبيانات', async () => {
        const res = await deleteRoute(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-owned' }),
        );
        expect(res.status).toBe(403);
        expect(deletePostMock).not.toHaveBeenCalled();
    });

    it('يسمح للمشرف بالحذف (إجراء إشراف مشروع)', async () => {
        actAs('mod-1', true);
        const res = await deleteRoute(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-owned' }),
        );
        expect(res.status).toBe(200);
        expect(deletePostMock).toHaveBeenCalledWith('post-owned');
    });

    it('يسمح للمالك بحذف منشوره', async () => {
        actAs(OWNER_ID);
        const res = await deleteRoute(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-owned' }),
        );
        expect(res.status).toBe(200);
    });
});

describe('صلاحية تعديل المنشور', () => {
    it('يرفض تعديل مستخدم لمحتوى منشور غيره بـ 403', async () => {
        const res = await updateRoute(
            jsonRequest('http://localhost/api/forum/update', {
                postId: 'post-owned',
                content: 'محتوى بديل يحاول مستخدم غير المالك فرضه على المنشور',
            }),
        );
        expect(res.status).toBe(403);
        expect(savePostCloudMock).not.toHaveBeenCalled();
    });
});

describe('عضوية المجموعة', () => {
    it('يمنع غير العضو من حذف منشور مجموعة حتى لو كان المالك', async () => {
        actAs(OWNER_ID);
        getPostByIdMock.mockResolvedValue(buildOwnerPost({ groupId: 'private-group' }));
        isMemberMock.mockResolvedValue(false);
        const res = await deleteRoute(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-owned' }),
        );
        expect(res.status).toBe(403);
        expect(deletePostMock).not.toHaveBeenCalled();
    });
});

describe('حد المعدل', () => {
    it('يوقف الطلبات المتكررة بـ 429 قبل الوصول للبيانات', async () => {
        rateLimitMock.mockResolvedValue(false);
        const res = await deleteRoute(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-owned' }),
        );
        expect(res.status).toBe(429);
        expect(getPostByIdMock).not.toHaveBeenCalled();
    });
});

describe('تعقيم المدخلات', () => {
    it('يزيل الوسوم غير المسموحة ويحفظ النص المحيط', () => {
        const out = sanitizePayload({ content: 'نص <b>bold</b> ووسم <x-tag>مضمّن</x-tag> قانوني' });
        expect(out.content).not.toContain('<');
        expect(out.content).toContain('قانوني');
    });

    it('ينظّف القيم داخل البنى المتداخلة (مصفوفات وكائنات)', () => {
        const out = sanitizePayload({
            nested: { list: ['<span>عنصر</span>', { deep: '<div>قيمة</div>' }] },
        });
        expect(JSON.stringify(out)).not.toContain('<span');
        expect(JSON.stringify(out)).not.toContain('<div');
    });

    it('يحافظ على النص العربي القانوني السليم دون تغيير', () => {
        const clean = 'استفسار عن المادة 400 من قانون العقوبات العراقي — التعديل الأخير';
        expect(sanitizePayload({ content: clean }).content).toBe(clean);
    });
});

describe('مدخلات غير صالحة', () => {
    it('يرفض body غير JSON بـ 400 دون انهيار', async () => {
        const res = await deleteRoute(
            new Request('http://localhost/api/forum/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'not-json{{{',
            }),
        );
        expect(res.status).toBe(400);
    });

    it('يرفض postId من نوع غير نصي', async () => {
        const res = await deleteRoute(
            jsonRequest('http://localhost/api/forum/delete', {
                postId: { not: 'a-string' } as unknown as string,
            }),
        );
        expect(res.status).toBe(400);
        expect(deletePostMock).not.toHaveBeenCalled();
    });

    it('يرفض postId فارغاً', async () => {
        const res = await deleteRoute(
            jsonRequest('http://localhost/api/forum/delete', { postId: '   ' }),
        );
        expect(res.status).toBe(400);
    });
});
