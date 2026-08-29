import { describe, expect, it } from 'vitest';
import {
    lineTotalIqd,
    normalizeMaritalFurnitureItems,
    readMaritalFurnitureItems,
    resolveMaritalFurnitureFinancialPrincipal,
    sumMaritalFurnitureTotal,
    sumUndeliveredMaritalFurnitureTotal,
} from '../maritalFurniture';

describe('maritalFurniture', () => {
    it('normalizes rows and computes line totals', () => {
        const items = normalizeMaritalFurnitureItems([
            { id: 'a', name: '  أريكة ', quantity: 2, unitPriceIqd: 500_000 },
            { id: 'b', name: '', quantity: 1, unitPriceIqd: 100 },
        ]);
        expect(items).toHaveLength(1);
        expect(lineTotalIqd(items[0]!)).toBe(1_000_000);
        expect(sumMaritalFurnitureTotal(items)).toBe(1_000_000);
    });

    it('migrates legacy furnitureDetails when list is empty', () => {
        const items = readMaritalFurnitureItems({
            furnitureDetails: 'ثلاجة؛ سرير',
            furnitureValue: 200_000,
        });
        expect(items).toHaveLength(2);
        expect(items[0]?.name).toBe('ثلاجة');
        expect(items[0]?.unitPriceIqd).toBe(100_000);
        expect(items[1]?.unitPriceIqd).toBe(100_000);
        expect(sumMaritalFurnitureTotal(items)).toBe(200_000);
    });

    it('uses stable ids when reading furnitureDetails fallback twice', () => {
        const data = { furnitureDetails: 'ثلاجة؛ سرير', furnitureValue: 200_000 };
        const first = readMaritalFurnitureItems(data);
        const second = readMaritalFurnitureItems(data);
        expect(first.map((row) => row.id)).toEqual(second.map((row) => row.id));
    });

    it('sums undelivered items only for financial center', () => {
        const items = normalizeMaritalFurnitureItems([
            { id: 'a', name: 'أريكة', quantity: 1, unitPriceIqd: 500_000, delivered: true },
            { id: 'b', name: 'سرير', quantity: 1, unitPriceIqd: 300_000, delivered: false },
        ]);
        expect(sumUndeliveredMaritalFurnitureTotal(items)).toBe(300_000);
        expect(sumMaritalFurnitureTotal(items)).toBe(800_000);
    });

    it('returns zero financial principal until delivery inventory is recorded', () => {
        const items = normalizeMaritalFurnitureItems([
            { id: 'a', name: 'أريكة', quantity: 1, unitPriceIqd: 800_000 },
        ]);
        expect(
            resolveMaritalFurnitureFinancialPrincipal({ maritalFurnitureItems: items })
        ).toBe(0);
    });

    it('returns undelivered total after delivery inventory is recorded', () => {
        const items = normalizeMaritalFurnitureItems([
            { id: 'a', name: 'أريكة', quantity: 1, unitPriceIqd: 500_000, delivered: true },
            { id: 'b', name: 'سرير', quantity: 1, unitPriceIqd: 300_000, delivered: false },
        ]);
        expect(
            resolveMaritalFurnitureFinancialPrincipal({
                maritalFurnitureDeliveryRecordedAt: '2026-06-06T12:00:00.000Z',
                maritalFurnitureItems: items,
            })
        ).toBe(300_000);
    });

    it('counts failed delivery outcome toward financial principal', () => {
        const items = normalizeMaritalFurnitureItems([
            {
                id: 'a',
                name: 'خزانة',
                quantity: 1,
                unitPriceIqd: 1_633_665,
                delivered: false,
                deliveryOutcome: 'failed',
                deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
            },
        ]);
        expect(sumUndeliveredMaritalFurnitureTotal(items)).toBe(1_633_665);
        expect(resolveMaritalFurnitureFinancialPrincipal({ maritalFurnitureItems: items })).toBe(
            1_633_665,
        );
    });

    it('ignores delivered flags without delivery inventory timestamp', () => {
        const items = normalizeMaritalFurnitureItems([
            { id: 'a', name: 'أريكة', quantity: 1, unitPriceIqd: 800_000, delivered: false },
        ]);
        expect(
            resolveMaritalFurnitureFinancialPrincipal({ maritalFurnitureItems: items })
        ).toBe(0);
    });
});
