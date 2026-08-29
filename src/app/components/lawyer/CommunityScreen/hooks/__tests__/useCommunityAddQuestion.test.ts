import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const createPost = vi.fn();
const sortCommunityPosts = vi.fn((posts: unknown[]) => posts);
const mergeCommunityPostsById = vi.fn((prev: unknown[], next: unknown[]) => [...next, ...prev]);

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        show: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/lib/forumService.js', () => ({
    uploadEncryptedForumImage: vi.fn().mockResolvedValue(null),
    publishForumPost: (...args: unknown[]) => createPost(...args),
}));

vi.mock('@/app/services/lawyer-cloud', () => ({
    LawyerStorage: {
        uploadSmartFile: vi.fn().mockResolvedValue({ path: 'cloud/path.pdf' }),
    },
}));

vi.mock('@/app/services/forumAttachmentService', () => ({
    createInstantForumAttachmentPreview: vi.fn((file: File) => ({
        url: `blob:mock-${file.name}`,
        storagePath: 'idb:forum:pending:test',
    })),
    persistForumAttachmentFile: vi.fn().mockResolvedValue('idb:forum:cached'),
    prepareForumAttachmentForPublish: vi.fn(async (attachment) => attachment),
}));

vi.mock('@/app/services/forum/forumApi/forumApiClientCore', () => ({
    persistForumPostLocally: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    mergeCommunityPostsById: (...args: unknown[]) => mergeCommunityPostsById(...args),
    sortCommunityPosts: (...args: unknown[]) => sortCommunityPosts(...args),
    syncCommunityPostToLocalMirror: vi.fn(),
}));

vi.mock('../../communityOverlayPrefetch', () => ({
    prefetchCommunityAddQuestionOverlay: vi.fn(),
}));

const applyAutoRedaction = vi.hoisted(() =>
    vi.fn((content: string) => ({ redacted: content, changed: false })),
);

vi.mock('../../utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../utils')>();
    return {
        ...actual,
        applyAutoRedaction,
    };
});

import { useCommunityAddQuestion } from '../useCommunityAddQuestion';
import { peekForumRateLimit } from '../../forumRateLimit';

describe('useCommunityAddQuestion', () => {
    beforeEach(() => {
        window.localStorage.clear();
        createPost.mockReset();
        applyAutoRedaction.mockReset();
        applyAutoRedaction.mockImplementation((content: string) => ({
            redacted: content,
            changed: false,
        }));
        createPost.mockResolvedValue({
            id: 'post-1',
            authorId: 'user-1',
            authorName: 'محامي',
            content: 'استشارة قانونية تجريبية طويلة',
            tags: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            attachment: null,
            upvoterIds: [],
            comments: [],
            bestCommentId: null,
        });
    });

    it('ينشر تفاؤلياً ويغلق الورقة فوراً', async () => {
        const setPosts = vi.fn();
        const onForumPostPublished = vi.fn();

        const { result } = renderHook(() =>
            useCommunityAddQuestion({
                lists: { setPosts, removePostFromList: vi.fn() },
                currentUserId: 'user-1',
                authUser: { user_metadata: { fullName: 'محامي' } },
                isBanned: false,
                activeGroupId: null,
                appendPublishedGroupPost: vi.fn(),
                onForumPostPublished,
            }),
        );

        act(() => {
            result.current.setNewPostText('استشارة قانونية تجريبية طويلة');
            result.current.openAddQuestion();
        });

        expect(result.current.isAddQuestionOpen).toBe(true);

        await act(async () => {
            await result.current.handleAddPost();
        });

        expect(result.current.isAddQuestionOpen).toBe(false);
        expect(onForumPostPublished).toHaveBeenCalledTimes(1);
        expect(setPosts).toHaveBeenCalled();
        expect(createPost).toHaveBeenCalledTimes(1);
    });

    it('يتجاهل النقر المزدوج أثناء النشر', async () => {
        const setPosts = vi.fn();
        let resolveCreate: (value: unknown) => void = () => undefined;
        createPost.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveCreate = resolve;
                }),
        );

        const { result } = renderHook(() =>
            useCommunityAddQuestion({
                lists: { setPosts, removePostFromList: vi.fn() },
                currentUserId: 'user-1',
                authUser: { user_metadata: { fullName: 'محامي' } },
                isBanned: false,
                activeGroupId: null,
                appendPublishedGroupPost: vi.fn(),
            }),
        );

        act(() => {
            result.current.setNewPostText('استشارة قانونية تجريبية طويلة');
        });

        let firstCall: Promise<void> | undefined;
        act(() => {
            firstCall = result.current.handleAddPost();
            void result.current.handleAddPost();
        });

        await act(async () => {
            resolveCreate({
                id: 'post-1',
                authorId: 'user-1',
                authorName: 'محامي',
                content: 'استشارة قانونية تجريبية طويلة',
                tags: [],
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                attachment: null,
                upvoterIds: [],
                comments: [],
                bestCommentId: null,
            });
            await firstCall;
        });

        expect(createPost).toHaveBeenCalledTimes(1);
    });

    it('يرفق الملف فوراً دون انتظار التخزين', async () => {
        const { result } = renderHook(() =>
            useCommunityAddQuestion({
                lists: { setPosts: vi.fn(), removePostFromList: vi.fn() },
                currentUserId: 'user-1',
                authUser: { user_metadata: { fullName: 'محامي' } },
                isBanned: false,
                activeGroupId: null,
                appendPublishedGroupPost: vi.fn(),
            }),
        );

        const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });

        await act(async () => {
            await result.current.handleUploadAttachment(file, 'image');
        });

        expect(result.current.newAttachment).toMatchObject({
            type: 'image',
            url: 'blob:mock-photo.jpg',
            name: 'photo.jpg',
        });
    });

    it('يعيد السماح بالنشر بعد فشل التنقيح الفارغ', async () => {
        applyAutoRedaction.mockReturnValueOnce({ redacted: '', changed: true });
        const { result } = renderHook(() =>
            useCommunityAddQuestion({
                lists: { setPosts: vi.fn(), removePostFromList: vi.fn() },
                currentUserId: 'user-1',
                authUser: { user_metadata: { fullName: 'محامي' } },
                isBanned: false,
                activeGroupId: null,
                appendPublishedGroupPost: vi.fn(),
            }),
        );

        act(() => {
            result.current.setNewPostText('استشارة قانونية تجريبية طويلة');
        });

        await act(async () => {
            await result.current.handleAddPost();
        });
        expect(createPost).not.toHaveBeenCalled();

        await act(async () => {
            await result.current.handleAddPost();
        });
        expect(createPost).toHaveBeenCalledTimes(1);
    });

    it('لا يستهلك حد النشر إذا فشل الخادم', async () => {
        createPost.mockRejectedValueOnce(new Error('تعذّر النشر'));
        const { result } = renderHook(() =>
            useCommunityAddQuestion({
                lists: { setPosts: vi.fn(), removePostFromList: vi.fn() },
                currentUserId: 'user-1',
                authUser: { user_metadata: { fullName: 'محامي' } },
                isBanned: false,
                activeGroupId: null,
                appendPublishedGroupPost: vi.fn(),
            }),
        );

        act(() => {
            result.current.setNewPostText('استشارة قانونية تجريبية طويلة');
        });

        await act(async () => {
            await result.current.handleAddPost();
        });

        expect(peekForumRateLimit('post', 'user-1').allowed).toBe(true);
    });

    it('يستهلك حد النشر بعد نجاح الخادم', async () => {
        const { result } = renderHook(() =>
            useCommunityAddQuestion({
                lists: { setPosts: vi.fn(), removePostFromList: vi.fn() },
                currentUserId: 'user-1',
                authUser: { user_metadata: { fullName: 'محامي' } },
                isBanned: false,
                activeGroupId: null,
                appendPublishedGroupPost: vi.fn(),
            }),
        );

        act(() => {
            result.current.setNewPostText('استشارة قانونية تجريبية طويلة');
        });

        await act(async () => {
            await result.current.handleAddPost();
        });

        expect(peekForumRateLimit('post', 'user-1').allowed).toBe(false);
    });
});
