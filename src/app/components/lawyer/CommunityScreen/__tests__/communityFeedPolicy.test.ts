import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => false,
}));

import {
    resolveCommunityForumPollMs,
    resolveForumUnreadPollMs,
} from '../communityFeedPolicy';
import {
    COMMUNITY_FORUM_POLL_MS_DEFAULT,
} from '../communityScreenConstants';

describe('communityFeedPolicy', () => {
    it('استطلاع الخلاصة 90 ثانية على الأجهزة العادية', () => {
        expect(resolveCommunityForumPollMs()).toBe(COMMUNITY_FORUM_POLL_MS_DEFAULT);
    });

    it('التنبيهات تتباطأ عند تشغيل التيار ولا تتوقف تماماً', () => {
        expect(resolveForumUnreadPollMs(false)).toBe(12_000);
        expect(resolveForumUnreadPollMs(true)).toBe(COMMUNITY_FORUM_POLL_MS_DEFAULT);
    });
});
