import { describe, expect, it, beforeEach } from 'vitest';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { scopeExecutionDeviceStorageKey } from '@/app/utils/executionDeviceStorageScope';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import {
    resolveExecutionFinancialHubPrincipalAmount,
    resolveMaritalFurnitureClaimExecutionData,
} from '../resolveExecutionFinancialHubPrincipal';

describe('resolveExecutionFinancialHubPrincipal', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        storageCache.clear();
    });

    it('returns prop amount when already positive', () => {
        expect(
            resolveExecutionFinancialHubPrincipalAmount({
                principalDebtAmount: 500_000,
                executionData: { claimType: 'أثاث زوجية' },
                executionId: 'ex-1',
                claimType: 'أثاث زوجية',
            }),
        ).toBe(500_000);
    });

    it('resolves failed marital furniture from executionData when prop is zero', () => {
        expect(
            resolveExecutionFinancialHubPrincipalAmount({
                principalDebtAmount: 0,
                executionData: {
                    claimType: 'أثاث زوجية',
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
                    ],
                },
                executionId: 'ex-mf',
                claimType: 'أثاث زوجية',
            }),
        ).toBe(1_633_665);
    });

    it('falls back to storage cache when file prop lacks delivery outcomes', () => {
        const dossierId = 'ex-mf-cache';
        storageCache.set(executionStorageKey(dossierId), {
            id: dossierId,
            claimType: 'أثاث زوجية',
            debtAmount: 555_555,
            totalAmount: 555_555,
            maritalFurnitureItems: [
                {
                    id: 'item-a',
                    name: 'أريكة',
                    quantity: 1,
                    unitPriceIqd: 555_555,
                    delivered: false,
                    deliveryOutcome: 'failed',
                    deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                },
            ],
        });

        const staleView = {
            id: dossierId,
            claimType: 'أثاث زوجية',
            maritalFurnitureItems: [
                {
                    id: 'item-a',
                    name: 'أريكة',
                    quantity: 1,
                    unitPriceIqd: 555_555,
                },
            ],
        };

        expect(
            resolveExecutionFinancialHubPrincipalAmount({
                principalDebtAmount: 0,
                executionData: staleView,
                executionId: dossierId,
                claimType: 'أثاث زوجية',
            }),
        ).toBe(555_555);

        const merged = resolveMaritalFurnitureClaimExecutionData(staleView, dossierId);
        expect((merged as { debtAmount?: number }).debtAmount).toBe(555_555);
    });

    it('falls back to owner-scoped storage when unscoped cache key is empty', () => {
        setLiveAuthUserId('mf-user');
        const dossierId = 'ex-mf-scoped';
        const key = executionStorageKey(dossierId);
        const scopedKey = scopeExecutionDeviceStorageKey(key);

        storageCache.set(key, {
            id: dossierId,
            claimType: 'أثاث زوجية',
            debtAmount: 1_633_665,
            totalAmount: 1_633_665,
            maritalFurnitureItems: [
                {
                    id: 'item-b',
                    name: 'خزانة',
                    quantity: 1,
                    unitPriceIqd: 1_633_665,
                    delivered: false,
                    deliveryOutcome: 'failed',
                    deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                },
            ],
        });

        expect(SecureStoreService.getItemSync(key)).toBeNull();
        expect(SecureStoreService.getItemSync(scopedKey)).toContain('1633665');
        storageCache.invalidate(key);

        expect(
            resolveExecutionFinancialHubPrincipalAmount({
                principalDebtAmount: 0,
                executionData: {
                    id: dossierId,
                    claimType: 'أثاث زوجية',
                    maritalFurnitureItems: [
                        {
                            id: 'item-b',
                            name: 'خزانة',
                            quantity: 1,
                            unitPriceIqd: 1_633_665,
                        },
                    ],
                },
                executionId: dossierId,
                claimType: 'أثاث زوجية',
            }),
        ).toBe(1_633_665);
    });
});
