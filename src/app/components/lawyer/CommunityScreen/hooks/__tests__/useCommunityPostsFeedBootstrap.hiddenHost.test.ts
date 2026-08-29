import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useCommunityPostsFeedBootstrap } from '@/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedBootstrap';

const listPostsMock = vi.fn(() => Promise.resolve([]));
const listPaginatedMock = vi.fn(() => Promise.resolve({ posts: [] }));

vi.mock('@/app/services/forum/forumCommunityRuntime', () => ({
    CommunityDB: {
        listPosts: (...args: unknown[]) => listPostsMock(...args),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listPostsPaginated: (...args: unknown[]) => listPaginatedMock(...args),
    },
}));

vi.mock('@/app/services/forum/forumPostsWarmCache', () => ({
    peekForumPostsCache: vi.fn(() => null),
    readForumPostsCache: vi.fn(() => Promise.resolve([])),
}));

function useBootstrapProbe(surfaceOpen: boolean) {
    const postsRef = useRef([]);
    const bootstrapped = useRef(false);
    const [, setPosts] = useState([]);
    const [, setLoading] = useState(false);
    const [, setHasMore] = useState(true);
    useCommunityPostsFeedBootstrap({
        activeSection: 'forum',
        pageSize: 20,
        postsRef,
        applyPostsUpdate: (updater) => setPosts((prev) => updater(prev)),
        setLoadingPosts: setLoading,
        setHasMore,
        postsBootstrappedRef: bootstrapped,
        surfaceOpen,
    });
}

describe('useCommunityPostsFeedBootstrap keepAlive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('لا يقرأ CommunityDB ولا الشبكة عندما السطح مغلق', () => {
        renderHook(() => useBootstrapProbe(false));
        expect(listPostsMock).not.toHaveBeenCalled();
        expect(listPaginatedMock).not.toHaveBeenCalled();
    });
});
