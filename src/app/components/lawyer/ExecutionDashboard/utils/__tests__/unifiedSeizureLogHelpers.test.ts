import { describe, expect, it } from 'vitest';
import { resolveFirstUnifiedSeizureTab } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogHelpers';

describe('resolveFirstUnifiedSeizureTab', () => {
    const counts = { property: 0, salary: 2, movable: 0, third_party: 1 };

    it('returns preferred tab when it has entries', () => {
        expect(resolveFirstUnifiedSeizureTab(counts, 'third_party')).toBe('third_party');
    });

    it('falls back to first tab with data when preferred is empty', () => {
        expect(resolveFirstUnifiedSeizureTab(counts, 'property')).toBe('salary');
    });

    it('defaults to property when all counts are zero', () => {
        expect(
            resolveFirstUnifiedSeizureTab({
                property: 0,
                salary: 0,
                movable: 0,
                third_party: 0,
            })
        ).toBe('property');
    });
});
