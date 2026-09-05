import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CommunityPost } from '@/app/services/forum/forumTypes';

const listPostsPaginated = vi.fn();

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listPostsPaginated: (...args: unknown[]) => listPostsPaginated(...args),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn() },
}));

import { useCommunityPostsFeedPaging } from '../useCommunityPostsFeedPaging';

function post(id: string): CommunityPost {
    return {
        id,
        authorId: 'u1',
        authorName: 'محامٍ',
        content: 'استشارة قانونية كافية للطول',
        tags: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
    };
}

describe('useCommunityPostsFeedPaging', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listPostsPaginated.mockResolvedValue({ posts: [post('p1')], total: 1 });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('الاستطلاع الصامت يطلب صفحة واحدة ولا يغيّر hasMore', async () => {
        const applyPostsUpdate = vi.fn((updater: (prev: CommunityPost[]) => CommunityPost[]) => {
            updater([post('p1'), post('p2')]);
        });
        const setHasMore = vi.fn();
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef: { current: [post('p1'), post('p2')] },
                applyPostsUpdate,
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore,
            }),
        );

        await act(async () => {
            await result.current.refreshPosts(true);
        });

        expect(listPostsPaginated).toHaveBeenCalledWith(20, 0);
        expect(setHasMore).not.toHaveBeenCalled();
    });

    it('التحديث الصريح يطلب حجم القائمة المحمّلة', async () => {
        const applyPostsUpdate = vi.fn((updater: (prev: CommunityPost[]) => CommunityPost[]) => {
            updater([post('p1')]);
        });
        const setHasMore = vi.fn();
        const loaded = Array.from({ length: 40 }, (_, i) => post(`p${i}`));
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef: { current: loaded },
                applyPostsUpdate,
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore,
            }),
        );

        await act(async () => {
            await result.current.refreshPosts(false);
        });

        expect(listPostsPaginated).toHaveBeenCalledWith(40, 0);
        expect(setHasMore).toHaveBeenCalled();
    });

    it('لا يكدّس استطلاعات صامتة متزامنة', async () => {
        let resolveList: (value: { posts: CommunityPost[]; total: number }) => void = () => undefined;
        listPostsPaginated.mockReturnValue(
            new Promise<{ posts: CommunityPost[]; total: number }>((resolve) => {
                resolveList = resolve;
            }),
        );
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef: { current: [post('p1')] },
                applyPostsUpdate: vi.fn((updater: (prev: CommunityPost[]) => CommunityPost[]) => {
                    updater([post('p1')]);
                }),
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore: vi.fn(),
            }),
        );

        let first: Promise<void> | undefined;
        let second: Promise<void> | undefined;
        await act(async () => {
            first = result.current.refreshPosts(true);
            second = result.current.refreshPosts(true);
            resolveList({ posts: [post('p1')], total: 1 });
            await first;
            await second;
        });

        expect(listPostsPaginated).toHaveBeenCalledTimes(1);
    });

    it('الاستطلاع الصامت يحرّر القفل بعد المهلة ولا يمسح الخلاصة', async () => {
        vi.useFakeTimers();
        listPostsPaginated.mockImplementation(() => new Promise(() => undefined));
        const applyPostsUpdate = vi.fn();
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef: { current: [post('p1')] },
                applyPostsUpdate,
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore: vi.fn(),
            }),
        );

        let pending: Promise<void> | undefined;
        await act(async () => {
            pending = result.current.refreshPosts(true);
            await vi.advanceTimersByTimeAsync(15_050);
            await pending;
        });
        expect(applyPostsUpdate).not.toHaveBeenCalled();

        listPostsPaginated.mockResolvedValue({ posts: [post('p1')], total: 1 });
        await act(async () => {
            await result.current.refreshPosts(true);
        });
        expect(listPostsPaginated).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });

    it('حمّل المزيد لا يتخطّى صفحة بعد استطلاع أضاف منشوراً', async () => {
        const twenty = Array.from({ length: 20 }, (_, i) => post(`p${i}`));
        const postsRef = { current: twenty };
        listPostsPaginated
            .mockResolvedValueOnce({ posts: [...twenty, post('extra')], total: 21 })
            .mockResolvedValueOnce({ posts: [post('p20')], total: 21 });
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef,
                applyPostsUpdate: (updater) => {
                    postsRef.current = updater(postsRef.current);
                },
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore: vi.fn(),
            }),
        );

        await act(async () => {
            await result.current.refreshPosts(true);
        });
        await act(async () => {
            await result.current.handleLoadMore();
        });

        expect(listPostsPaginated).toHaveBeenNthCalledWith(2, 20, 20);
        expect(postsRef.current.some((p) => p.id === 'extra')).toBe(true);
    });

    it('الاستطلاع الصامت يثبّت إزاحة صفحة الخادم لا طول الكاش المحلي', async () => {
        const twenty = Array.from({ length: 20 }, (_, i) => post(`p${i}`));
        const postsRef = { current: [...twenty, post('local-extra')] };
        listPostsPaginated
            .mockResolvedValueOnce({ posts: twenty, total: 21 })
            .mockResolvedValueOnce({ posts: [post('p20')], total: 21 });
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef,
                applyPostsUpdate: (updater) => {
                    postsRef.current = updater(postsRef.current);
                },
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore: vi.fn(),
            }),
        );

        await act(async () => {
            await result.current.refreshPosts(true);
        });
        await act(async () => {
            await result.current.handleLoadMore();
        });

        expect(listPostsPaginated).toHaveBeenNthCalledWith(2, 20, 20);
    });

    it('المهلة الصامتة لا تجمّد إزاحة من طول القائمة المحلية', async () => {
        vi.useFakeTimers();
        listPostsPaginated.mockImplementation(() => new Promise(() => undefined));
        const postsRef = { current: Array.from({ length: 21 }, (_, i) => post(`p${i}`)) };
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef,
                applyPostsUpdate: vi.fn(),
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore: vi.fn(),
            }),
        );

        let pending: Promise<void> | undefined;
        await act(async () => {
            pending = result.current.refreshPosts(true);
            await vi.advanceTimersByTimeAsync(15_050);
            await pending;
        });

        listPostsPaginated.mockResolvedValue({ posts: [post('p20')], total: 21 });
        await act(async () => {
            await result.current.handleLoadMore();
        });
        expect(listPostsPaginated).toHaveBeenLastCalledWith(20, 0);
    });

    it('حمّل المزيد يستخدم إزاحة صفحة الخادم حتى مع منشور محلي زائد', async () => {
        const twenty = Array.from({ length: 20 }, (_, i) => post(`p${i}`));
        const postsRef = { current: [...twenty, post('local-extra')] };
        listPostsPaginated.mockResolvedValueOnce({ posts: [post('p20')], total: 21 });
        const { result } = renderHook(() =>
            useCommunityPostsFeedPaging({
                pageSize: 20,
                postsRef,
                applyPostsUpdate: (updater) => {
                    postsRef.current = updater(postsRef.current);
                },
                loadingMore: false,
                hasMore: true,
                setLoadingMore: vi.fn(),
                setHasMore: vi.fn(),
            }),
        );

        act(() => {
            result.current.acknowledgeServerPage(20);
        });
        await act(async () => {
            await result.current.handleLoadMore();
        });

        expect(listPostsPaginated).toHaveBeenCalledWith(20, 20);
    });
});
