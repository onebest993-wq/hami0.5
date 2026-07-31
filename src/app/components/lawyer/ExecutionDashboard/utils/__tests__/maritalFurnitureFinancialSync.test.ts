import { describe, expect, it } from 'vitest';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { resolveMaritalFurnitureFinancialSyncPatch } from '../maritalFurnitureFinancialSync';

describe('resolveMaritalFurnitureFinancialSyncPatch', () => {
    it('does not zero stored debt when followup items are still stale', () => {
        const dossierId = 'mf-sync-1';
        storageCache.set(executionStorageKey(dossierId), {
            id: dossierId,
            claimType: 'أثاث زوجية',
            debtAmount: 2_189_220,
            totalAmount: 2_189_220,
            maritalFurnitureItems: [
                {
                    id: 'a',
                    name: 'خزانة',
                    quantity: 1,
                    unitPriceIqd: 1_633_665,
                    delivered: false,
                    deliveryOutcome: 'failed',
                    deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                },
                {
                    id: 'b',
                    name: 'أريكة',
                    quantity: 1,
                    unitPriceIqd: 555_555,
                    delivered: false,
                    deliveryOutcome: 'failed',
                    deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                },
            ],
        });

        const patch = resolveMaritalFurnitureFinancialSyncPatch({
            executionData: {
                id: dossierId,
                claimType: 'أثاث زوجية',
                debtAmount: 2_189_220,
                totalAmount: 2_189_220,
                maritalFurnitureItems: [
                    {
                        id: 'a',
                        name: 'خزانة',
                        quantity: 1,
                        unitPriceIqd: 1_633_665,
                    },
                ],
            },
            executionId: dossierId,
            maritalFurnitureItemsForFollowup: [
                {
                    id: 'a',
                    name: 'خزانة',
                    quantity: 1,
                    unitPriceIqd: 1_633_665,
                },
            ],
        });

        expect(patch).toBeNull();
    });

    it('writes undelivered total once delivery outcomes are visible', () => {
        const items = [
            {
                id: 'a',
                name: 'خزانة',
                quantity: 1,
                unitPriceIqd: 555_555,
                delivered: false,
                deliveryOutcome: 'failed' as const,
                deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
            },
        ];

        const patch = resolveMaritalFurnitureFinancialSyncPatch({
            executionData: {
                id: 'mf-sync-2',
                claimType: 'أثاث زوجية',
                debtAmount: 0,
                totalAmount: 0,
                maritalFurnitureItems: items,
            },
            executionId: 'mf-sync-2',
            maritalFurnitureItemsForFollowup: items,
        });

        expect(patch).toEqual({ debtAmount: 555_555, totalAmount: 555_555 });
    });
});
