import { describe, expect, it, vi, beforeEach } from 'vitest';

const warmForumPostsCache = vi.fn();
const warmForumSocialCache = vi.fn();
const shouldAllowIntentWarm = vi.fn(() => true);
const isLitePerformanceActive = vi.fn(() => false);
const hydrateCommunityShellForInstantOpen = vi.fn(async () => true);
const canUseNetworkFeatures = vi.fn(() => true);

vi.mock('@/app/services/forum/forumPostsWarmCache', () => ({
    warmForumPostsCache: (...args: unknown[]) => warmForumPostsCache(...args),
}));

vi.mock('@/app/services/forum/forumSocialWarmCache', () => ({
    warmForumSocialCache: (...args: unknown[]) => warmForumSocialCache(...args),
}));

vi.mock('@/app/services/settings/intentWarmGate', () => ({
    shouldAllowIntentWarmFromDom: () => shouldAllowIntentWarm(),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => isLitePerformanceActive(),
}));

vi.mock('@/app/runtime/communityBootHydrator', () => ({
    hydrateCommunityShellForInstantOpen: (...args: unknown[]) =>
        hydrateCommunityShellForInstantOpen(...args),
}));

vi.mock('@/app/services/auth/lawyerAccountStatus', () => ({
    canUseNetworkFeatures: (...args: unknown[]) => canUseNetworkFeatures(...args),
}));

describe('§29 Forum intent warm — سلوك ديناميكي', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        shouldAllowIntentWarm.mockReturnValue(true);
        isLitePerformanceActive.mockReturnValue(false);
        canUseNetworkFeatures.mockReturnValue(true);
    });

    it('warmForumOnHover يسخّن الكاش دون استيراد ثابت لـ ForumApiService', async () => {
        const { readFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const file = readFileSync(
            join(process.cwd(), 'src/app/hooks/lawyerDashboard/forumIntentWarm.ts'),
            'utf8',
        );
        expect(file).not.toMatch(/from ['"]@\/app\/services\/forumApiService['"]/);
        expect(file).not.toMatch(/from ['"]@\/app\/utils\/lazyComponents['"]/);

        const mod = await import('@/app/hooks/lawyerDashboard/forumIntentWarm');
        mod.warmForumOnHover('user-1');
        await vi.waitFor(() => {
            expect(warmForumPostsCache).toHaveBeenCalled();
            expect(warmForumSocialCache).toHaveBeenCalledWith('user-1');
        });
    });

    it('warmForumOnOpen في وضع lite يسخّن الوحدة دون تسخين منشورات كامل', async () => {
        isLitePerformanceActive.mockReturnValue(true);
        const mod = await import('@/app/hooks/lawyerDashboard/forumIntentWarm');
        mod.warmForumOnOpen('user-2');
        expect(warmForumPostsCache).not.toHaveBeenCalled();
        expect(warmForumSocialCache).not.toHaveBeenCalled();
    });
});
