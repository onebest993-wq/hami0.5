import { describe, it, expect } from 'vitest';
import {
    ANONYMOUS_USER_ID,
    ANONYMOUS_USER_NAME,
    forumAuthorDisplayName,
    redactAnonymousAuthor,
} from '../forumMapper';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

function buildPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'p1',
        authorId: 'real-user-id',
        authorName: 'محامي حقيقي',
        content: 'سؤال',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        ...overrides,
    };
}

describe('redactAnonymousAuthor — حماية هوية النشر المجهول', () => {
    it('لا يُغيّر منشوراً غير مجهول لأي مشاهد', () => {
        const p = buildPost({ isAnonymous: false });
        expect(redactAnonymousAuthor(p, 'someone', false)).toEqual(p);
        expect(redactAnonymousAuthor(p, null, false)).toEqual(p);
    });

    it('يُخفي الهوية لمستخدم عادي ليس المالك', () => {
        const p = buildPost({ isAnonymous: true });
        const result = redactAnonymousAuthor(p, 'other-user', false);
        expect(result.authorId).toBe(ANONYMOUS_USER_ID);
        expect(result.authorName).toBe(ANONYMOUS_USER_NAME);
        // باقي الحقول كما هي
        expect(result.id).toBe(p.id);
        expect(result.content).toBe(p.content);
    });

    it('يُحافظ على هوية المالك (يحتاج معرفتها لزر التعديل/الحذف)', () => {
        const p = buildPost({ isAnonymous: true });
        const result = redactAnonymousAuthor(p, 'real-user-id', false);
        expect(result.authorId).toBe('real-user-id');
        expect(result.authorName).toBe('محامي حقيقي');
    });

    it('يُحافظ على الهوية للأدمن (للإشراف ومعرفة المخالفين)', () => {
        const p = buildPost({ isAnonymous: true });
        const result = redactAnonymousAuthor(p, 'admin-user', true);
        expect(result.authorId).toBe('real-user-id');
        expect(result.authorName).toBe('محامي حقيقي');
    });

    it('يُخفي الهوية لمشاهد غير مسجّل (viewerId = null)', () => {
        const p = buildPost({ isAnonymous: true });
        const result = redactAnonymousAuthor(p, null, false);
        expect(result.authorId).toBe(ANONYMOUS_USER_ID);
        expect(result.authorName).toBe(ANONYMOUS_USER_NAME);
    });

    it('لا يُعدّل الكائن الأصلي (immutable)', () => {
        const p = buildPost({ isAnonymous: true });
        const before = JSON.stringify(p);
        redactAnonymousAuthor(p, 'other-user', false);
        expect(JSON.stringify(p)).toBe(before);
    });

    it('يُخفي تعليق المؤلف نفسه على منشوره المجهول (منع كشف الهوية بالاستنتاج)', () => {
        const p = buildPost({
            isAnonymous: true,
            comments: [
                {
                    id: 'c1',
                    postId: 'p1',
                    authorId: 'real-user-id',
                    authorName: 'محامي حقيقي',
                    content: 'تعليق من نفس المؤلف',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'c2',
                    postId: 'p1',
                    authorId: 'someone-else',
                    authorName: 'معلّق آخر',
                    content: 'تعليق من شخص آخر',
                    createdAt: new Date().toISOString(),
                },
            ],
        });
        const result = redactAnonymousAuthor(p, 'viewer-X', false);
        // تعليق المؤلف نفسه أُخفي
        expect(result.comments[0].authorId).toBe(ANONYMOUS_USER_ID);
        expect(result.comments[0].authorName).toBe(ANONYMOUS_USER_NAME);
        // تعليق شخص آخر بقي كما هو
        expect(result.comments[1].authorId).toBe('someone-else');
        expect(result.comments[1].authorName).toBe('معلّق آخر');
    });

    it('لا يُخفي تعليق المؤلف عن نفسه (يحتاج معرفته للتعديل)', () => {
        const p = buildPost({
            isAnonymous: true,
            comments: [
                {
                    id: 'c1',
                    postId: 'p1',
                    authorId: 'real-user-id',
                    authorName: 'محامي حقيقي',
                    content: 'x',
                    createdAt: new Date().toISOString(),
                },
            ],
        });
        const result = redactAnonymousAuthor(p, 'real-user-id', false);
        expect(result.comments[0].authorId).toBe('real-user-id');
    });

    it('لا يُخفي التعليقات للأدمن (للإشراف)', () => {
        const p = buildPost({
            isAnonymous: true,
            comments: [
                {
                    id: 'c1',
                    postId: 'p1',
                    authorId: 'real-user-id',
                    authorName: 'محامي حقيقي',
                    content: 'x',
                    createdAt: new Date().toISOString(),
                },
            ],
        });
        const result = redactAnonymousAuthor(p, 'admin', true);
        expect(result.comments[0].authorId).toBe('real-user-id');
    });
});

describe('forumAuthorDisplayName', () => {
    it('يعيد الاسم المجهول للمنشورات المجهولة', () => {
        expect(
            forumAuthorDisplayName({
                isAnonymous: true,
                authorName: 'اسم حقيقي',
            }),
        ).toBe(ANONYMOUS_USER_NAME);
    });
});
