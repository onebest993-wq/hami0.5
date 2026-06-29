import { describe, expect, it, vi, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    sendInitialSpecificDeliveryMovableValuationRequest,
    SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
} from '../specificDeliveryMovableValuationRequest';

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
        dispatchDecisionsReload: vi.fn(),
    };
});

describe('specificDeliveryMovableValuationRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('blocks duplicate send when executor already approved (complete report in card)', () => {
        vi.mocked(SecureStoreService.getItemSync).mockReturnValue(
            JSON.stringify([
                {
                    id: 'val-1',
                    requestKind: 'special_followup',
                    title: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
                    executorOutcome: 'approved',
                },
            ])
        );
        const result = sendInitialSpecificDeliveryMovableValuationRequest({ executionId: 'ex-1' });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('executor_approved');
    });

    it('allows resubmit after superseding completed hub', () => {
        vi.mocked(SecureStoreService.getItemSync).mockReturnValue(
            JSON.stringify([
                {
                    id: 'val-old',
                    requestKind: 'special_followup',
                    title: SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE,
                    executorOutcome: 'approved',
                    specificDeliveryMovableValuationSavedAt: new Date().toISOString(),
                },
            ])
        );
        const blocked = sendInitialSpecificDeliveryMovableValuationRequest({ executionId: 'ex-1' });
        expect(blocked.ok).toBe(false);
        expect(blocked.reason).toBe('complete');

        const resubmit = sendInitialSpecificDeliveryMovableValuationRequest({
            executionId: 'ex-1',
            supersedeCompletedHub: true,
        });
        expect(resubmit.ok).toBe(true);
    });
});
