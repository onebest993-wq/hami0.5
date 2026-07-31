/**
 * حالات نادرة/حدّية: تكرار الإرسال (double-submit)، التكرار الآمن (idempotency)،
 * والفشل الجزئي (partial failure) — للتأكد من ثبات السلوك دون فقد بيانات
 * أو تكرارها أو حجب وظيفة بسبب عطل ثانوي.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityPost } from '../forumTypes';

// ---------- forumCommunityRuntime (تخزين محلي مُحاكى) ----------
const store = new Map<string, CommunityPost>();
const savePostMock = vi.fn(async (post: CommunityPost) => {
    store.set(post.id, post);
});

vi.mock('@/app/services/forum/forumCommunityRuntime', () => ({
    CommunityDB: {
        savePost: (post: CommunityPost) => savePostMock(post),
        deletePost: vi.fn(async (id: string) => {
            store.delete(id);
        }),
    },
    getCommunityPostById: vi.fn(async (id: string) => store.get(id) ?? null),
    getCommunityPosts: vi.fn(async () => [...store.values()]),
    addCommunityComment: vi.fn(),
}));

vi.mock('../loadForumSupabaseAdmin', () => ({
    loadForumSupabaseAdmin: async () => null,
    isForumSupabaseConfigured: () => false,
}));

import { ForumRepository } from '../forumRepository';

function buildPost(id: string): CommunityPost {
    return {
        id,
        authorId: 'author-1',
        author_id: 'author-1',
        authorName: 'محامٍ',
        content: 'محتوى منشور صالح بطول كافٍ للاختبار',
        tags: [],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        upvotes: 0,
        upvoterIds: [],
        comments: [],
    } as CommunityPost;
}

beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
});

describe('createPost — منع الكتابة فوق منشور بنفس المعرّف (double-submit / تصادم)', () => {
    it('يرفض إنشاء منشور ثانٍ بنفس المعرّف', async () => {
        await ForumRepository.createPost(buildPost('dup-id'));
        await expect(ForumRepository.createPost(buildPost('dup-id'))).rejects.toThrow(
            /مستخدم مسبقاً/,
        );
        expect(savePostMock).toHaveBeenCalledTimes(1);
    });

    it('يحفظ منشورين مختلفين دون تداخل', async () => {
        await ForumRepository.createPost(buildPost('id-a'));
        await ForumRepository.createPost(buildPost('id-b'));
        expect(store.size).toBe(2);
    });
});
