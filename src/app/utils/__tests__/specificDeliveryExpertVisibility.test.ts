import { describe, expect, it } from 'vitest';
import {
    hasApprovedSpecificDeliveryConversionDecision,
    hasSpecificDeliveryConversionDecision,
    isSpecificDeliveryJudgmentValuePredetermined,
    shouldShowSpecificDeliveryMovableValuationExpert,
    shouldShowSpecificDeliveryPropertyExpert,
} from '@/app/utils/specificDeliveryExpertVisibility';
import { SPECIFIC_DELIVERY_CONVERSION_TITLE } from '@/app/utils/specificDeliveryConversionRequest';

describe('specificDeliveryExpertVisibility', () => {
    const conversionRow = {
        id: 'conv-1',
        title: SPECIFIC_DELIVERY_CONVERSION_TITLE,
        requestKind: 'special_followup',
        payloadJson: JSON.stringify({ kind: 'specific_delivery_conversion' }),
    };

    const savedConversionRow = {
        ...conversionRow,
        executorOutcome: 'approved',
        specificDeliveryConversionSavedAt: new Date().toISOString(),
    };

    it('shows property expert only for immovable with flag', () => {
        expect(
            shouldShowSpecificDeliveryPropertyExpert({
                specificDeliveryItemNature: 'immovable',
                showPropertyExpertCardFlag: true,
            })
        ).toBe(true);
        expect(
            shouldShowSpecificDeliveryPropertyExpert({
                specificDeliveryItemNature: 'movable',
                showPropertyExpertCardFlag: true,
            })
        ).toBe(false);
    });

    const approvedConversionRow = {
        ...conversionRow,
        executorOutcome: 'approved',
        payloadJson: JSON.stringify({
            kind: 'specific_delivery_conversion',
            itemId: 'b',
            itemName: 'سيارة',
        }),
    };

    it('shows movable valuation after executor approves conversion (linked item)', () => {
        expect(
            shouldShowSpecificDeliveryMovableValuationExpert({
                specificDeliveryItemNature: 'movable',
                specificDeliveryFinancialized: false,
                debtAmount: 0,
                totalAmount: 0,
                decisions: [],
            })
        ).toBe(false);
        expect(
            shouldShowSpecificDeliveryMovableValuationExpert({
                specificDeliveryItemNature: 'movable',
                specificDeliveryFinancialized: false,
                debtAmount: 0,
                totalAmount: 0,
                decisions: [conversionRow],
            })
        ).toBe(false);
        expect(
            shouldShowSpecificDeliveryMovableValuationExpert({
                specificDeliveryItems: [
                    {
                        id: 'b',
                        name: 'سيارة',
                        nature: 'movable',
                        status: 'pending',
                    },
                ],
                specificDeliveryFinancialized: false,
                debtAmount: 0,
                totalAmount: 0,
                decisions: [approvedConversionRow],
            })
        ).toBe(true);
    });

    it('shows movable valuation with multi-item when one item destroyed and conversion saved', () => {
        expect(
            shouldShowSpecificDeliveryMovableValuationExpert({
                specificDeliveryItemNature: 'movable',
                specificDeliveryItems: [
                    {
                        id: 'a',
                        name: 'هالك',
                        nature: 'movable',
                        status: 'financialized',
                        financializedAmount: 5_000_000,
                        declaredDestroyed: true,
                    },
                    {
                        id: 'b',
                        name: 'سيارة',
                        nature: 'movable',
                        status: 'pending',
                        declaredDestroyed: true,
                    },
                ],
                specificDeliveryFinancialized: false,
                debtAmount: 5_000_000,
                totalAmount: 5_000_000,
                decisions: [savedConversionRow],
            })
        ).toBe(true);
    });

    it('hides movable valuation when judgment value already set (legacy single item)', () => {
        expect(
            isSpecificDeliveryJudgmentValuePredetermined({
                debtAmount: 500000,
                totalAmount: 0,
            })
        ).toBe(true);
        expect(
            shouldShowSpecificDeliveryMovableValuationExpert({
                specificDeliveryItemNature: 'movable',
                specificDeliveryFinancialized: false,
                debtAmount: 500000,
                totalAmount: 0,
                decisions: [savedConversionRow],
            })
        ).toBe(false);
    });

    it('detects conversion decision rows', () => {
        expect(hasSpecificDeliveryConversionDecision([conversionRow])).toBe(true);
        expect(hasSpecificDeliveryConversionDecision([])).toBe(false);
    });

    it('detects approved conversion only when executor approved or saved', () => {
        expect(hasApprovedSpecificDeliveryConversionDecision([conversionRow])).toBe(false);
        expect(hasApprovedSpecificDeliveryConversionDecision([savedConversionRow])).toBe(true);
        expect(
            hasApprovedSpecificDeliveryConversionDecision([
                { ...conversionRow, executorOutcome: 'approved' },
            ])
        ).toBe(true);
        expect(
            hasApprovedSpecificDeliveryConversionDecision([
                {
                    ...conversionRow,
                    specificDeliveryConversionSavedAt: new Date().toISOString(),
                },
            ])
        ).toBe(true);
    });
});
