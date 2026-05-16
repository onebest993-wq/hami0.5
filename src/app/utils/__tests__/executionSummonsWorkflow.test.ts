import { describe, expect, it } from 'vitest';
import { getExecutionSummons7DayWindow } from '@/app/utils/executionSummonsWorkflow';

describe('getExecutionSummons7DayWindow', () => {
    it('computes start and expiry based on next-day start + 7 days', () => {
        const w = getExecutionSummons7DayWindow('2026-04-05', new Date(2026, 3, 5, 12, 0, 0));
        expect(w.startDateYmd).toBe('2026-04-06');
        expect(w.expiryDateYmd).toBe('2026-04-13');
    });

    it('treats currentDate >= expiryDate as expired', () => {
        const before = getExecutionSummons7DayWindow(
            '2026-04-05',
            new Date(2026, 3, 12, 12, 0, 0)
        );
        expect(before.isExpired).toBe(false);

        const onExpiry = getExecutionSummons7DayWindow(
            '2026-04-05',
            new Date(2026, 3, 13, 12, 0, 0)
        );
        expect(onExpiry.isExpired).toBe(true);
    });
});

