import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import {
    TRANSACTION_LIST_RENDER_BATCH,
    resolveTransactionListLimit,
} from '@/app/components/lawyer/TransactionsThreading/utils/transactionListWindow';

function item(id: string): Transaction {
    return {
        id,
        title: id,
        clientName: 'موكل',
        targetDepartment: 'دائرة',
        status: TransactionStatus.Active,
        agreedFees: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    };
}

describe('transactionListWindow', () => {
    it('يقطع بعد الدفعة ويبقي العدد الكامل للحساب', () => {
        const items = Array.from({ length: 40 }, (_, i) => item(`tx-${i}`));
        const limit = resolveTransactionListLimit({
            total: items.length,
            requested: TRANSACTION_LIST_RENDER_BATCH,
            items,
        });
        expect(limit).toBe(TRANSACTION_LIST_RENDER_BATCH);
        expect(items.slice(0, limit)).toHaveLength(TRANSACTION_LIST_RENDER_BATCH);
        expect(items.length - limit).toBe(12);
    });

    it('يمد النافذة حتى بطاقة التركيز', () => {
        const items = Array.from({ length: 40 }, (_, i) => item(`tx-${i}`));
        const limit = resolveTransactionListLimit({
            total: items.length,
            requested: TRANSACTION_LIST_RENDER_BATCH,
            items,
            ensureId: 'tx-35',
        });
        expect(limit).toBe(36);
        expect(items.slice(0, limit).some((tx) => tx.id === 'tx-35')).toBe(true);
    });
});
