import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

type ResolveFn = (rows: Array<{ groupId?: string }>) => void;

const mocks = vi.hoisted(() => {
    const listPostsMockImpl = vi.fn<() => Promise<Array<{ groupId?: string }>>>();
    let listPostsResolversImpl: Array<ResolveFn> = [];
    let peekMockReturnImpl: unknown = null;
    const markPhaseMockImpl = vi.fn();
    const reportPerfMockImpl = vi.fn();

    listPostsMockImpl.mockImplementation(() =>
        new Promise<Array<{ groupId?: string }>>((resolve) => {
            listPostsResolversImpl.push(resolve);
        }),
    );

    return {
        listPostsMock: listPostsMockImpl,
        getResolvers: () => listPostsResolversImpl,
        resetResolvers: () => {
            listPostsResolversImpl = [];
        },
        addResolver: (r: ResolveFn) => listPostsResolversImpl.push(r),
        getPeek: () => peekMockReturnImpl,
        setPeek: (v: unknown) => {
            peekMockReturnImpl = v;
        },
        markPhaseMock: markPhaseMockImpl,
        reportPerfMock: reportPerfMockImpl,
        tearDownMock: vi.fn(),
    };
});

vi.mock('@/app/components/lawyer/CommunityScreen/tearDownForumFloatingState', () => ({
    tearDownForumFloatingState: mocks.tearDownMock,
}));

vi.mock('@/app/services/forum/forumCommunityRuntime', () => ({
    CommunityDB: {
        listPosts: () => mocks.listPostsMock(),
    },
}));

vi.mock('@/app/services/forum/forumPostsWarmCache', () => ({
    peekForumPostsCache: () => mocks.getPeek(),
}));

vi.mock('@/app/services/forum/forumPerfMetrics', () => ({
    markForumPerfPhase: mocks.markPhaseMock,
    reportForumPerf: mocks.reportPerfMock,
}));

import { sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    sortCommunityPosts: (rows: Array<unknown>) => rows as ReturnType<typeof sortCommunityPosts>,
    CommunityDB: {
        listPosts: () => mocks.listPostsMock(),
    },
    ForumBookmarkDB: { listBookmarks: () => Promise.resolve([]) },
    BanDB: { isBanned: () => Promise.resolve(false) },
    FollowDB: { isFollowing: () => Promise.resolve(false) },
    syncCommunityPostToLocalMirror: () => {},
    filterDeletedCommunityPosts: (rows: Array<unknown>) => rows as ReturnType<typeof filterDeletedCommunityPosts>,
    mergeCommunityPostsById: (a: Array<unknown>, b: Array<unknown>) => [...a, ...b],
}));

function filterDeletedCommunityPosts<T>(rows: T[]): T[] {
    return rows;
}

import { useForumLifecycle } from '../useForumLifecycle';

describe('useForumLifecycle — session guard + hadLocalCache reset', () => {
    beforeEach(() => {
        if (typeof performance !== 'undefined' && typeof performance.clearMarks === 'function') {
            performance.clearMarks();
        }
        vi.clearAllMocks();
        mocks.resetResolvers();
        mocks.setPeek(null);
    });

    afterEach(() => {
        mocks.getResolvers().forEach((r) => r([]));
        mocks.resetResolvers();
    });

    it('hadLocalCacheRef يتم إعادة تعيينه إلى false عند كل فتح جديدة (لا يلوث الجلسة التالية)', async () => {
        mocks.setPeek([{ id: 'p1' }] as unknown as Array<{ groupId?: string }>);
        const { rerender, result } = renderHook(
            ({ isOpen, visiblePostCount }) =>
                useForumLifecycle('u1', false, visiblePostCount, isOpen),
            { initialProps: { isOpen: true as boolean, visiblePostCount: 3 } },
        );
        await act(async () => {
            await Promise.resolve();
        });
        rerender({ isOpen: true, visiblePostCount: 3 });
        expect(result.current.hadLocalCache).toBe(true);

        mocks.setPeek(null);
        rerender({ isOpen: false, visiblePostCount: 3 });
        await act(async () => {
            await Promise.resolve();
        });
        rerender({ isOpen: false, visiblePostCount: 3 });
        expect(result.current.hadLocalCache).toBe(false);

        rerender({ isOpen: true, visiblePostCount: 3 });
        await act(async () => {
            await Promise.resolve();
        });
        expect(mocks.listPostsMock).toHaveBeenCalledTimes(1);
        rerender({ isOpen: true, visiblePostCount: 3 });
        expect(result.current.hadLocalCache).toBe(false);

        const resolvers = mocks.getResolvers();
        await act(async () => {
            resolvers[0]([]);
        });

        await Promise.resolve();
        rerender({ isOpen: true, visiblePostCount: 3 });
        expect(result.current.hadLocalCache).toBe(false);
    });

    it('لا يتم إطلاق تقرير ثانٍ عند تغيير visiblePostCount ضمن نفس الجلسة (dep array protection)', () => {
        const { rerender } = renderHook(
            ({ isOpen, visiblePostCount }) =>
                useForumLifecycle('u1', false, visiblePostCount, isOpen),
            { initialProps: { isOpen: true as boolean, visiblePostCount: 0 } },
        );

        expect(mocks.reportPerfMock).toHaveBeenCalledTimes(1);

        rerender({ isOpen: true, visiblePostCount: 5 });
        rerender({ isOpen: true, visiblePostCount: 12 });
        rerender({ isOpen: true, visiblePostCount: 20 });

        expect(mocks.reportPerfMock).toHaveBeenCalledTimes(1);
        expect(mocks.markPhaseMock).toHaveBeenCalledWith('first-paint');
        expect(mocks.markPhaseMock).toHaveBeenCalledWith('interactive');
    });

    /**
     * وصولُ المنشورات لا يُغلق الطبقة التي تعرضها.
     *
     * أثرُ القياس تبعيّاته `[isOpen, userId, visiblePostCount]`، وتنظيفُه كان يستدعي
     * `tearDownForumFloatingState` — وهو يُخفي `forum-overlay-host` وينزع
     * `data-hami-forum-open`. فأوّلُ تغيّرٍ في عدد المنشورات بعد الطلاء الأوّل كان
     * يُغلق المنتدى وهو مفتوح. قيس في E2E: فتحٌ عند ١٫١ث، ووصولُ البطاقات وإغلاقُ
     * الطبقة في الإطار نفسه عند ٢٣٫٣ث.
     */
    it('تغيّر visiblePostCount لا يُفكّك حالة المنتدى العائمة', () => {
        const { rerender } = renderHook(
            ({ isOpen, visiblePostCount }) =>
                useForumLifecycle('u1', false, visiblePostCount, isOpen),
            { initialProps: { isOpen: true as boolean, visiblePostCount: 0 } },
        );

        expect(mocks.tearDownMock).not.toHaveBeenCalled();

        rerender({ isOpen: true, visiblePostCount: 2 });

        expect(mocks.tearDownMock).not.toHaveBeenCalled();
    });

    it('stale CommunityDB promise من جلسة مغلقة لا يكتب hadLocalCache للجلسة الحالية (cross-session guard)', async () => {
        const { rerender, result } = renderHook(
            ({ isOpen }) => useForumLifecycle('u1', false, 0, isOpen),
            { initialProps: { isOpen: true as boolean } },
        );

        expect(mocks.listPostsMock).toHaveBeenCalledTimes(1);
        expect(mocks.getResolvers().length).toBe(1);

        rerender({ isOpen: false });
        rerender({ isOpen: true });

        expect(mocks.listPostsMock).toHaveBeenCalledTimes(2);
        expect(mocks.getResolvers().length).toBe(2);
        rerender({ isOpen: true });
        expect(result.current.hadLocalCache).toBe(false);

        const resolvers = mocks.getResolvers();
        await act(async () => {
            resolvers[0]([{ id: 'stale-post' }] as unknown as Array<{ groupId?: string }>);
        });

        await Promise.resolve();
        rerender({ isOpen: true });
        expect(result.current.hadLocalCache).toBe(false);
    });
});
