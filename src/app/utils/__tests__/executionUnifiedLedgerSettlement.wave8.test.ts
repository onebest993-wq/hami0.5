/**
 * ربط settlementLifecycle بالوعاء الموحّد — اختبار reload صادق للموجة 8.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import { simulateRegisterSettlement } from '@/app/components/lawyer/FinancialOperationsCenter/settlementLifecycle';
import {
    emptyStore,
    parseUnifiedLedgerFromStorage,
    storageKey,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';

describe('unified ledger settlement reload (wave 8)', () => {
    const execId = 'exec_settlement_wave8';

    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        storageCache.clear();
    });

    it('registered settlement survives cache invalidate + disk read', () => {
        const base = emptyStore();
        const registered = simulateRegisterSettlement({
            store: base,
            amount: 200_000,
            dueDate: '2026-09-01',
            remainingUnified: 800_000,
            atIso: '2026-08-01T12:00:00.000Z',
        });
        expect(registered.ok).toBe(true);
        if (!registered.ok || !('store' in registered)) return;

        const ledgerKey = storageKey(execId);
        storageCache.set(ledgerKey, registered.store);
        storageCache.invalidate(ledgerKey);

        const reloaded = parseUnifiedLedgerFromStorage(storageCache.get(ledgerKey));
        expect(reloaded?.pendingSettlement?.amount).toBe(200_000);
        expect(reloaded?.pendingSettlement?.dueDate).toBe('2026-09-01');
    });
});
