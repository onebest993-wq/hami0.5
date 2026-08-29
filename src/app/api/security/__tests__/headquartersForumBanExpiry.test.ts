import { describe, expect, it } from 'vitest';
import {
    isHqForumBanActive,
    parseHqForumBanExpiry,
    resolveHqForumBanExpiry,
} from '../headquartersForumBanExpiry.ts';

const NOW = Date.parse('2026-08-28T12:00:00.000Z');

describe('headquartersForumBanExpiry', () => {
    it('يعتبر الحظر الدائم ساريًا ويرفض منتهيًا أو تاريخًا تالفًا', () => {
        expect(isHqForumBanActive(undefined, NOW)).toBe(true);
        expect(isHqForumBanActive('2026-08-29T00:00:00.000Z', NOW)).toBe(true);
        expect(isHqForumBanActive('2026-08-27T00:00:00.000Z', NOW)).toBe(false);
        expect(isHqForumBanActive('not-a-date', NOW)).toBe(false);
    });

    it('يرفض انتهاءً في الماضي أو أبعد من حد الواجهة', () => {
        expect(parseHqForumBanExpiry('2026-08-01T00:00:00.000Z', NOW)).toBe('invalid');
        expect(parseHqForumBanExpiry('2027-08-28T12:00:00.000Z', NOW)).toBe('invalid');
        expect(parseHqForumBanExpiry('2026-08-29T12:00:00.000Z', NOW)).toBe('2026-08-29T12:00:00.000Z');
        expect(parseHqForumBanExpiry(undefined, NOW)).toBeUndefined();
    });

    it('يحسب المدة من ساعات الواجهة ويتجاهل expiresAt عند وجودها', () => {
        expect(resolveHqForumBanExpiry({ durationHours: 0 }, NOW)).toBeUndefined();
        expect(resolveHqForumBanExpiry({ durationHours: 24 }, NOW)).toBe(
            new Date(NOW + 24 * 3_600_000).toISOString(),
        );
        expect(resolveHqForumBanExpiry({ durationHours: 168 }, NOW)).toBe(
            new Date(NOW + 168 * 3_600_000).toISOString(),
        );
        expect(resolveHqForumBanExpiry({ durationHours: 99 }, NOW)).toBe('invalid');
        expect(
            resolveHqForumBanExpiry(
                { durationHours: 24, expiresAt: '2026-08-01T00:00:00.000Z' },
                NOW,
            ),
        ).toBe(new Date(NOW + 24 * 3_600_000).toISOString());
    });
});
