import { describe, expect, it } from 'vitest';
import {
    aggregateSpecificDeliveryDebtExposure,
    aggregateSpecificDeliveryFinancializedAmount,
    allSpecificDeliveryItemsFinancialized,
    applyIntakeDestroyedFinancialization,
    createEmptySpecificDeliveryItem,
    hasPendingSpecificDeliveryItems,
    markSpecificDeliveryItemFinancialized,
    readSpecificDeliveryItems,
    syncSpecificDeliveryLegacyFields,
} from '../specificDeliveryItemsUtils';
import { resolveSpecificDeliveryUiPhase } from '../resolveSpecificDeliveryUiPhase';

describe('specificDeliveryItemsUtils', () => {
    it('reads legacy single item from name and nature', () => {
        const items = readSpecificDeliveryItems({
            specificDeliveryItemName: 'سيارة',
            specificDeliveryItemNature: 'movable',
        });
        expect(items).toHaveLength(1);
        expect(items[0]?.name).toBe('سيارة');
        expect(items[0]?.status).toBe('pending');
    });

    it('marks one item financialized while others stay pending', () => {
        const a = createEmptySpecificDeliveryItem('movable');
        const b = { ...createEmptySpecificDeliveryItem('immovable'), name: 'أرض' };
        const next = markSpecificDeliveryItemFinancialized([a, b], a.id, 500_000);
        expect(hasPendingSpecificDeliveryItems(next)).toBe(true);
        expect(allSpecificDeliveryItemsFinancialized(next)).toBe(false);
        expect(aggregateSpecificDeliveryFinancializedAmount(next)).toBe(500_000);
    });

    it('aggregateSpecificDeliveryDebtExposure includes judgment value for destroyed items', () => {
        const row = {
            ...createEmptySpecificDeliveryItem('movable'),
            name: 'سيارة',
            declaredDestroyed: true,
            judgmentValueIqd: 2_000_000,
        };
        expect(aggregateSpecificDeliveryDebtExposure([row])).toBe(2_000_000);
        const fin = applyIntakeDestroyedFinancialization([row]);
        expect(aggregateSpecificDeliveryDebtExposure(fin)).toBe(2_000_000);
    });

    it('applyIntakeDestroyedFinancialization converts declared destroyed items', () => {
        const row = {
            ...createEmptySpecificDeliveryItem('movable'),
            name: 'سيارة',
            declaredDestroyed: true,
            judgmentValueIqd: 2_000_000,
        };
        const next = applyIntakeDestroyedFinancialization([row]);
        expect(next[0]?.status).toBe('financialized');
        expect(next[0]?.financializedAmount).toBe(2_000_000);
    });

    it('syncs legacy fields only when all items financialized', () => {
        const a = createEmptySpecificDeliveryItem('movable');
        const b = { ...createEmptySpecificDeliveryItem('immovable'), name: 'أرض' };
        const partial = syncSpecificDeliveryLegacyFields(
            markSpecificDeliveryItemFinancialized([a, b], a.id, 100)
        );
        expect(partial.specificDeliveryFinancialized).toBe(false);

        const allDone = syncSpecificDeliveryLegacyFields(
            markSpecificDeliveryItemFinancialized(
                markSpecificDeliveryItemFinancialized([a, b], a.id, 100),
                b.id,
                200
            )
        );
        expect(allDone.specificDeliveryFinancialized).toBe(true);
        expect(allDone.specificDeliveryConvertedAmount).toBe(300);
    });
});

describe('resolveSpecificDeliveryUiPhase partial financialization', () => {
    it('keeps field procedures when only some items are financialized', () => {
        const items = [
            { ...createEmptySpecificDeliveryItem('movable'), name: 'سيارة', status: 'financialized' as const, financializedAmount: 1 },
            { ...createEmptySpecificDeliveryItem('immovable'), name: 'أرض', status: 'pending' as const },
        ];
        const phase = resolveSpecificDeliveryUiPhase({
            specificDeliveryItems: items,
            specificDeliveryFinancialized: true,
            isEmployee: false,
        });
        expect(phase.showFieldProcedures).toBe(true);
        expect(phase.phase).toBe('pre_delivery');
    });
});
