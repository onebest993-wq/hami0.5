import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/utils/executorSeizureDecisionQueue', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/app/utils/executorSeizureDecisionQueue')>()),
    getDebtorHeirSubstitutionRequestStatus: vi.fn(() => 'approved'),
    patchExecutorDecisionRow: vi.fn(),
}));

vi.mock('@/app/utils/partyDeathUiEvents', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/app/utils/partyDeathUiEvents')>()),
    dispatchOpenHeirsNotificationCenter: vi.fn(),
}));

import { runPartyDeathSave } from '../executionDashboardPartyDeathSave';
import { dispatchOpenHeirsNotificationCenter } from '@/app/utils/partyDeathUiEvents';

describe('runPartyDeathSave — debtor heir follow-up', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('seeds heirs notification workflow and opens the follow-up center after substitution save', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn((updater: unknown) => {
            if (typeof updater === 'function') {
                (updater as (prev: unknown[]) => unknown[])([]);
            }
        });

        const ok = runPartyDeathSave(
            {
                action: 'heir_substitution',
                deceased_party: 'debtor',
                heir_names: ['وريث أ'],
                heir_details: [{ name: 'وريث أ', phone: '0770', address: 'بغداد' }],
            },
            {
                executionDataRef: {
                    current: {
                        id: 'ex-9',
                        debtors: [{ name: 'مدين', type: 'debtor' }],
                        creditors: [],
                    } as never,
                },
                executionData: { id: 'ex-9' } as never,
                claimType: 'استحصال دين مالي',
                creditors: [],
                debtors: [{ name: 'مدين', type: 'debtor' } as never],
                decisionsStorageExecutionId: 'ex-9',
                partyDeathModalDecisionId: 'dec-1',
                nextTimelineId: () => 't1',
                persistExecutionMerge,
                patchExecutorDecisionRow: vi.fn(),
                showToast: vi.fn(),
                setTimelineEvents,
            },
        );

        expect(ok).toBe(true);
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                heirs_notification_workflow: expect.objectContaining({
                    byHeir: expect.objectContaining({
                        ['وريث أ']: expect.objectContaining({
                            heirName: 'وريث أ',
                            memoStatus: 'none',
                        }),
                    }),
                }),
            }),
        );
        expect(dispatchOpenHeirsNotificationCenter).toHaveBeenCalledWith({
            executionId: 'ex-9',
            heirNames: ['وريث أ'],
        });
    });
});
