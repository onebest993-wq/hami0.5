import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// نُعيد استيراد الموديول في كل اختبار للحصول على Map نظيف (state مشترك)
async function loadFreshModule() {
    vi.resetModules();
    return await import('../forumRateLimitServer');
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
    vi.useRealTimers();
});

describe('checkForumActionRateLimit (server)', () => {
    it('يرفض userId فارغاً', async () => {
        const { checkForumActionRateLimit } = await loadFreshModule();
        expect(checkForumActionRateLimit('', 'post')).toBe(false);
    });

    describe('post action', () => {
        it('يسمح بأول منشور', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            expect(checkForumActionRateLimit('user-1', 'post')).toBe(true);
        });

        it('يمنع منشورين متتاليين خلال 30s (burst)', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            expect(checkForumActionRateLimit('user-1', 'post')).toBe(true);
            expect(checkForumActionRateLimit('user-1', 'post')).toBe(false);
        });

        it('يسمح بعد انقضاء burst window', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            expect(checkForumActionRateLimit('user-1', 'post')).toBe(true);
            vi.advanceTimersByTime(31_000); // > 30s
            expect(checkForumActionRateLimit('user-1', 'post')).toBe(true);
        });
    });

    describe('comment action', () => {
        it('يسمح بأول تعليق', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            expect(checkForumActionRateLimit('user-1', 'comment')).toBe(true);
        });

        it('يمنع تعليقين متتاليين خلال 8s (burst)', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            expect(checkForumActionRateLimit('user-1', 'comment')).toBe(true);
            expect(checkForumActionRateLimit('user-1', 'comment')).toBe(false);
        });
    });

    describe('upvote action', () => {
        it('يسمح بحتى 60 تصويتاً في الدقيقة', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            for (let i = 0; i < 60; i += 1) {
                expect(checkForumActionRateLimit('user-1', 'upvote')).toBe(true);
            }
            expect(checkForumActionRateLimit('user-1', 'upvote')).toBe(false);
        });

        it('يفصل المستخدمين عن بعضهم', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            for (let i = 0; i < 60; i += 1) {
                checkForumActionRateLimit('user-1', 'upvote');
            }
            // user-2 لم يصل للحد بعد
            expect(checkForumActionRateLimit('user-2', 'upvote')).toBe(true);
        });
    });

    describe('report action (per postId)', () => {
        it('يسمح ببلاغ واحد لكل منشور', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            expect(checkForumActionRateLimit('user-1', 'report', { postId: 'p1' })).toBe(true);
            expect(checkForumActionRateLimit('user-1', 'report', { postId: 'p1' })).toBe(false);
        });

        it('يسمح بالإبلاغ عن منشورات مختلفة من نفس المستخدم', async () => {
            const { checkForumActionRateLimit } = await loadFreshModule();
            expect(checkForumActionRateLimit('user-1', 'report', { postId: 'p1' })).toBe(true);
            expect(checkForumActionRateLimit('user-1', 'report', { postId: 'p2' })).toBe(true);
        });
    });
});
