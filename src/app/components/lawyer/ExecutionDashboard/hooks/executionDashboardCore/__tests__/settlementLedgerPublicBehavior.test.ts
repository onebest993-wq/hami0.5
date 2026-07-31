import { describe, expect, it, vi, beforeEach } from 'vitest';
import { storageCache } from '@/app/utils/storageCache';
import { emptyStore, storageKey } from '@/app/slices/financial/ledgerPublic';
import { clearSettlementFromLedgerStorage } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardSettlementLedger';

describe('§29 Execution↔FOC settlement via ledgerPublic', () => {
    beforeEach(() => {
        storageCache.clear();
        vi.restoreAllMocks();
    });

    it('يمسح pendingSettlement عبر السطح العام ويطلق حدث الدفتر', () => {
        const exId = 'exec-s29-1';
        const key = storageKey(exId);
        const store = {
            ...emptyStore(),
            pendingSettlement: {
                id: 'ps-1',
                amount: 1000,
            },
            settlementBreachTriggeredAt: '2026-01-01',
        };
        storageCache.set(key, store);

        const setRevision = vi.fn((updater: (v: number) => number) => updater(0));
        const events: Event[] = [];
        const onEvt = (e: Event) => events.push(e);
        window.addEventListener('hami-unified-ledger-updated', onEvt);

        clearSettlementFromLedgerStorage(exId, exId, setRevision);

        window.removeEventListener('hami-unified-ledger-updated', onEvt);

        const next = storageCache.get(key) as {
            pendingSettlement?: unknown;
            settlementBreachTriggeredAt?: unknown;
        };
        expect(next?.pendingSettlement).toBeNull();
        expect(next?.settlementBreachTriggeredAt).toBeNull();
        expect(setRevision).toHaveBeenCalledTimes(1);
        expect(events.some((e) => e.type === 'hami-unified-ledger-updated')).toBe(true);
    });
});
