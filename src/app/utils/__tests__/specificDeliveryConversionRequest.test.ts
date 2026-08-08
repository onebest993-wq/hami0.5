import { describe, expect, it, vi, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    completeSpecificDeliveryConversionApproval,
    finalizeSpecificDeliveryConversionRequest,
    isSpecificDeliveryConversionCycleComplete,
    isSpecificDeliveryConversionDecisionRow,
    sendInitialSpecificDeliveryConversionRequest,
    SPECIFIC_DELIVERY_CONVERSION_TITLE,
} from '../specificDeliveryConversionRequest';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: vi.fn(() => '[]'),
        setItemSync: vi.fn(),
    },
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/executorSeizureDecisionQueue')>();
    return {
        ...actual,
        patchExecutorDecisionRow: vi.fn(() => true),
        patchExecutorDecisionRowReliable: vi.fn(() => ({ ok: true, storageExecutionId: 'ex-1' })),
        dispatchDecisionsReload: vi.fn(),
    };
});

describe('specificDeliveryConversionRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sends initial conversion request decision row', () => {
        const result = sendInitialSpecificDeliveryConversionRequest({ executionId: 'ex-1' });
        expect(result.ok).toBe(true);
        expect(result.decisionId).toBeTruthy();
        expect(SecureStoreService.setItemSync).toHaveBeenCalled();
    });

    it('detects conversion decision rows', () => {
        expect(SPECIFIC_DELIVERY_CONVERSION_TITLE).toContain('تحويل المطالبة');
        expect(
            isSpecificDeliveryConversionDecisionRow({
                requestKind: 'special_followup',
                title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
            })
        ).toBe(true);
        expect(
            isSpecificDeliveryConversionDecisionRow({
                requestKind: 'special_followup',
                payloadJson: JSON.stringify({ kind: 'specific_delivery_conversion' }),
            })
        ).toBe(true);
        expect(isSpecificDeliveryConversionDecisionRow({ requestKind: 'other' })).toBe(false);
    });

    it('completes conversion approval without cash value (expert determines value)', async () => {
        const { patchExecutorDecisionRowReliable } = await import('@/app/utils/executorSeizureDecisionQueue');
        const result = completeSpecificDeliveryConversionApproval({
            executionId: 'ex-1',
            decisionId: 'dec-1',
            itemName: 'سيارة',
        });
        expect(result.ok).toBe(true);
        expect(patchExecutorDecisionRowReliable).toHaveBeenCalledWith(
            'ex-1',
            'dec-1',
            expect.objectContaining({
                specificDeliveryConversionSavedAt: expect.any(String),
                specificDeliveryConversionAmount: null,
            })
        );
    });

    it('finalizes conversion with cash value', async () => {
        const { patchExecutorDecisionRowReliable } = await import('@/app/utils/executorSeizureDecisionQueue');
        const result = finalizeSpecificDeliveryConversionRequest({
            executionId: 'ex-1',
            decisionId: 'dec-1',
            cashValue: 1_500_000,
            itemName: 'سيارة',
        });
        expect(result.ok).toBe(true);
        expect(result.amount).toBe(1_500_000);
        expect(patchExecutorDecisionRowReliable).toHaveBeenCalledWith(
            'ex-1',
            'dec-1',
            expect.objectContaining({
                specificDeliveryConversionAmount: 1_500_000,
            })
        );
    });

    it('marks cycle complete after saved cash or rejection only', () => {
        expect(
            isSpecificDeliveryConversionCycleComplete({
                specificDeliveryConversionSavedAt: new Date().toISOString(),
            })
        ).toBe(true);
        expect(
            isSpecificDeliveryConversionCycleComplete(
                { executorOutcome: 'approved' },
                { allDecisions: [{ executorOutcome: 'approved' }] }
            )
        ).toBe(false);
        expect(
            isSpecificDeliveryConversionCycleComplete(
                { executorOutcome: 'approved' },
                { requiresCashValue: true }
            )
        ).toBe(false);
    });

    it('allows resubmit after superseding completed hub row', () => {
        const stored: Record<string, unknown>[] = [
            {
                id: 'old',
                requestKind: 'special_followup',
                title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
                executorOutcome: 'approved',
                specificDeliveryConversionSavedAt: new Date().toISOString(),
            },
        ];
        vi.mocked(SecureStoreService.getItemSync).mockReturnValue(JSON.stringify(stored));
        const blocked = sendInitialSpecificDeliveryConversionRequest({ executionId: 'ex-1' });
        expect(blocked.ok).toBe(false);
        const resubmit = sendInitialSpecificDeliveryConversionRequest({
            executionId: 'ex-1',
            supersedeCompletedHub: true,
        });
        expect(resubmit.ok).toBe(true);
    });
});
