import { describe, expect, it, vi, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    finalizeSpecificDeliveryConversionRequest,
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

    it('finalizes conversion with cash value', async () => {
        const { patchExecutorDecisionRow } = await import('@/app/utils/executorSeizureDecisionQueue');
        const result = finalizeSpecificDeliveryConversionRequest({
            executionId: 'ex-1',
            decisionId: 'dec-1',
            cashValue: 1_500_000,
            itemName: 'سيارة',
        });
        expect(result.ok).toBe(true);
        expect(result.amount).toBe(1_500_000);
        expect(patchExecutorDecisionRow).toHaveBeenCalledWith(
            'ex-1',
            'dec-1',
            expect.objectContaining({
                specificDeliveryConversionAmount: 1_500_000,
            })
        );
    });
});
