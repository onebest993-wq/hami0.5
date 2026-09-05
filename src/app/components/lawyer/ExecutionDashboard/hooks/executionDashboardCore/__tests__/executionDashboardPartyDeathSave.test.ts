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

    it('does not throw when executionDataRef is missing — falls back to executionData', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn((updater: unknown) => {
            if (typeof updater === 'function') {
                (updater as (prev: unknown[]) => unknown[])([]);
            }
        });
        const showToast = vi.fn();
        expect(() =>
            runPartyDeathSave(
                { action: 'death_only', deceased_party: 'debtor' },
                {
                    executionDataRef: undefined as never,
                    executionData: {
                        id: 'ex-2',
                        debtors: [{ name: 'مدين', type: 'debtor' }],
                        creditors: [],
                    } as never,
                    claimType: 'استحصال دين مالي',
                    creditors: [],
                    debtors: [{ name: 'مدين', type: 'debtor' } as never],
                    decisionsStorageExecutionId: 'ex-2',
                    partyDeathModalDecisionId: null,
                    nextTimelineId: () => 't1',
                    persistExecutionMerge,
                    patchExecutorDecisionRow: vi.fn(),
                    showToast,
                    setTimelineEvents,
                },
            ),
        ).not.toThrow();
        expect(persistExecutionMerge).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('تم تسجيل الإبلاغ عن الوفاة.', 'success');
    });
});
