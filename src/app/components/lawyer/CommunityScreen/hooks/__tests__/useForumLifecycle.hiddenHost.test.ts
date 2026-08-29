import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const listPostsMock = vi.fn(() => Promise.resolve([]));

vi.mock('@/app/services/forum/forumCommunityRuntime', () => ({
    CommunityDB: {
        listPosts: (...args: unknown[]) => listPostsMock(...args),
    },
}));

vi.mock('@/app/services/forum/forumPostsWarmCache', () => ({
    peekForumPostsCache: vi.fn(() => null),
}));

vi.mock('@/app/services/forum/forumPerfMetrics', () => ({
    markForumPerfPhase: vi.fn(),
    reportForumPerf: vi.fn(),
}));

import { useForumLifecycle } from '../useForumLifecycle';

describe('useForumLifecycle hidden keepAlive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('لا يقرأ CommunityDB عند isOpen=false', () => {
        renderHook(() => useForumLifecycle('lawyer-1', true, 0, false));
        expect(listPostsMock).not.toHaveBeenCalled();
    });

    it('يقرأ CommunityDB عند isOpen=true', () => {
        renderHook(() => useForumLifecycle('lawyer-1', true, 0, true));
        expect(listPostsMock).toHaveBeenCalledTimes(1);
    });

    it('يسجّل first-paint و interactive عند فتح السطح ولو المنشورات ما زالت تُحمَّل', async () => {
        const { markForumPerfPhase } = await import('@/app/services/forum/forumPerfMetrics');
        renderHook(() => useForumLifecycle('lawyer-1', true, 0, true));
        expect(markForumPerfPhase).toHaveBeenCalledWith('first-paint');
        expect(markForumPerfPhase).toHaveBeenCalledWith('interactive');
    });

    it('لا يسجّل علامات الأداء بينما keepAlive مغلق', async () => {
        const { markForumPerfPhase } = await import('@/app/services/forum/forumPerfMetrics');
        renderHook(() => useForumLifecycle('lawyer-1', true, 0, false));
        expect(markForumPerfPhase).not.toHaveBeenCalled();
    });
});
