import { describe, expect, it, vi, beforeEach } from 'vitest';

const listGroups = vi.fn(async () => [{ id: 'g1', name: 'مجموعة' }]);

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        listGroups: (...args: unknown[]) => listGroups(...args),
    },
}));

describe('forumGroupsWarmCache', () => {
    beforeEach(() => {
        vi.resetModules();
        listGroups.mockClear();
    });

    it('يخزّن القائمة بعد التسخين', async () => {
        const { peekForumGroupsCache, warmForumGroupsCache } = await import(
            '@/app/services/forum/forumGroupsWarmCache'
        );
        expect(peekForumGroupsCache()).toBeNull();
        warmForumGroupsCache();
        await vi.waitFor(() => {
            expect(peekForumGroupsCache()?.[0]?.id).toBe('g1');
        });
        expect(listGroups).toHaveBeenCalledTimes(1);
    });
});
