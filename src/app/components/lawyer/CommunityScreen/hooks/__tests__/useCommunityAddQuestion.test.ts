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

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        createPost: (...args: unknown[]) => createPost(...args),
    },
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
}));

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    mergeCommunityPostsById: (...args: unknown[]) => mergeCommunityPostsById(...args),
    sortCommunityPosts: (...args: unknown[]) => sortCommunityPosts(...args),
}));

vi.mock('../communityScreenLazyOverlays', () => ({
    prefetchCommunityAddQuestionOverlay: vi.fn(),
}));

vi.mock('../utils', () => ({
    applyAutoRedaction: (content: string) => ({ redacted: content, changed: false }),
}));

import { useCommunityAddQuestion } from '../useCommunityAddQuestion';

describe('useCommunityAddQuestion', () => {
    beforeEach(() => {
        window.localStorage.clear();
        createPost.mockReset();
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
});
