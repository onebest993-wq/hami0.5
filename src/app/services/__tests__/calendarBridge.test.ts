import { describe, expect, it } from 'vitest';
import {
    normalizeDateToYmd,
    partiesSummaryFromList,
    resolveCalendarUserId,
} from '../calendarBridge';

describe('calendarBridge', () => {
    it('normalizeDateToYmd accepts ISO and plain dates', () => {
        expect(normalizeDateToYmd('2026-06-06')).toBe('2026-06-06');
        expect(normalizeDateToYmd('2026-06-06T14:30:00')).toBe('2026-06-06');
        expect(normalizeDateToYmd('')).toBeNull();
    });

    it('partiesSummaryFromList joins names', () => {
        const s = partiesSummaryFromList([
            { name: 'أحمد', role: 'مدعي' },
            { name: 'علي', role: 'مدعى عليه' },
        ]);
        expect(s).toContain('أحمد');
        expect(s).toContain('علي');
    });

    it('resolveCalendarUserId falls back to dev user in vitest', () => {
        expect(resolveCalendarUserId(null)).toBe('dev-user-uuid-1');
        expect(resolveCalendarUserId('lawyer-42')).toBe('lawyer-42');
        expect(resolveCalendarUserId('')).toBe('dev-user-uuid-1');
    });
});
