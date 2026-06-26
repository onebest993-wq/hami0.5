import { describe, expect, it, vi } from 'vitest';
import { runPartyDeathSave } from '../executionDashboardPartyDeathSave';

describe('runPartyDeathSave', () => {
    it('blocks heir substitution paths when claim has no heir route', () => {
        const showToast = vi.fn();
        const ok = runPartyDeathSave(
            { action: 'no_heirs', deceased_party: 'creditor', heir_names: [], heir_details: [] },
            {
                executionDataRef: { current: { claimType: 'مشاهدة' } as never },
                executionData: { claimType: 'مشاهدة' } as never,
                claimType: 'مشاهدة',
                creditors: [{ name: 'دائن', type: 'creditor' } as never],
                debtors: [],
                decisionsStorageExecutionId: 'ex-1',
                partyDeathModalDecisionId: null,
                nextTimelineId: () => 't1',
                persistExecutionMerge: vi.fn(),
                patchExecutorDecisionRow: vi.fn(),
                showToast,
                setTimelineEvents: vi.fn(),
            },
        );
        expect(ok).toBe(false);
        expect(showToast).toHaveBeenCalledWith(
            'لا يوجد مسار ورثة لهذا النوع من المطالبة.',
            'info',
        );
    });
});
