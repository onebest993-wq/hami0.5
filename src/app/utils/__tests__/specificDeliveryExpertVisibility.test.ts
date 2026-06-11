import { describe, expect, it } from 'vitest';
import {
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

    it('hides movable valuation until conversion decision exists', () => {
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
        ).toBe(true);
    });

    it('hides movable valuation when judgment value already set', () => {
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
                decisions: [conversionRow],
            })
        ).toBe(false);
    });

    it('detects conversion decision rows', () => {
        expect(hasSpecificDeliveryConversionDecision([conversionRow])).toBe(true);
        expect(hasSpecificDeliveryConversionDecision([])).toBe(false);
    });
});
