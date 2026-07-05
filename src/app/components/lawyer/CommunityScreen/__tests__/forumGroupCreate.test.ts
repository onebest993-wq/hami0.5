import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createForumGroupResilient } from '../forumGroupCreate';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';

const mockGroup: ForumGroup = {
    id: 'g1',
    name: 'مجموعة اختبار',
    description: 'وصف تجريبي للمجموعة',
    coverImage: null,
    creatorId: 'u1',
    isOfficial: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    memberCount: 1,
    isMember: true,
    viewerRole: 'admin',
};

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        createGroup: vi.fn(),
    },
}));

vi.mock('../forumAsync', () => ({
    withForumAsyncTimeout: vi.fn(async (promise: Promise<unknown>, _ms: number, fallback: unknown) => {
        try {
            return await promise;
        } catch {
            return fallback;
        }
    }),
}));

describe('createForumGroupResilient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('returns API group when network succeeds', async () => {
        const { ForumApiService } = await import('@/app/services/forumApiService');
        vi.mocked(ForumApiService.createGroup).mockResolvedValue(mockGroup);

        const result = await createForumGroupResilient(
            { name: 'مجموعة اختبار', description: 'وصف تجريبي للمجموعة' },
            'u1',
        );

        expect(result).toEqual(mockGroup);
    });

    it('falls back to local store when API times out', async () => {
        const { ForumApiService } = await import('@/app/services/forumApiService');
        const { withForumAsyncTimeout } = await import('../forumAsync');
        vi.mocked(ForumApiService.createGroup).mockImplementation(
            () => new Promise(() => undefined),
        );
        vi.mocked(withForumAsyncTimeout).mockResolvedValue(null);

        const result = await createForumGroupResilient(
            { name: 'مجموعة محلية', description: 'وصف محلي للمجموعة' },
            'u1',
        );

        expect(result.name).toBe('مجموعة محلية');
        expect(result.creatorId).toBe('u1');
        expect(result.isMember).toBe(true);
    });
});
