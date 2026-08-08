import { describe, expect, it } from 'vitest';
import {
    ABANDONMENT_REVIEW_DAYS,
    formatInterruptionBannerText,
    resolveAbandonmentReviewDeadline,
} from '../caseFlowStatusDisplay';

describe('caseFlowStatusDisplay', () => {
    it('computes abandonment review deadline as 10 days after the day after event', () => {
        expect(resolveAbandonmentReviewDeadline('2026-08-04')).toBe('2026-08-15');
        expect(ABANDONMENT_REVIEW_DAYS).toBe(10);
    });

    it('formats interruption banner with reason and party', () => {
        const text = formatInterruptionBannerText({
            reason: 'وفاة الخصم',
            affectedParty: 'المدعى عليه',
        });
        expect(text.headline).toContain('انقطاع السير');
        expect(text.detail).toContain('وفاة الخصم');
        expect(text.detail).toContain('المدعى عليه');
    });
});
