import { describe, expect, it } from 'vitest';
import { TransactionStatus, type Transaction } from '@/app/modules/transactionsThreading/types';
import { filterTransactionsList } from '@/app/services/transactions/filterTransactionsList';

const baseTx = (overrides: Partial<Transaction>): Transaction => ({
    id: 'tx-1',
    title: 'نقل ملكية',
    clientName: 'أحمد علي',
    targetDepartment: 'دائرة الضريبة',
    status: TransactionStatus.Active,
    agreedFees: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

const SAMPLE: Transaction[] = [
    baseTx({ id: '1', title: 'معاملة نشطة', clientName: 'سارة', status: TransactionStatus.Active }),
    baseTx({ id: '2', title: 'معاملة مكتملة', clientName: 'محمد', status: TransactionStatus.Completed }),
    baseTx({ id: '3', title: 'في الانتظار', clientName: 'علي', status: TransactionStatus.Paused }),
];

describe('filterTransactionsList', () => {
    it('يعرض الكل بدون فلتر أو بحث', () => {
        expect(filterTransactionsList(SAMPLE, '', 'all')).toHaveLength(3);
    });

    it('يفلتر حسب الحالة', () => {
        expect(filterTransactionsList(SAMPLE, '', TransactionStatus.Active)).toHaveLength(1);
        expect(filterTransactionsList(SAMPLE, '', TransactionStatus.Completed)[0]?.title).toBe('معاملة مكتملة');
    });

    it('يبحث في العنوان واسم الموكل', () => {
        expect(filterTransactionsList(SAMPLE, 'سارة', 'all')).toHaveLength(1);
        expect(filterTransactionsList(SAMPLE, 'مكتملة', 'all')).toHaveLength(1);
        expect(filterTransactionsList(SAMPLE, 'xyz', 'all')).toHaveLength(0);
    });

    it('يجمع البحث والفلتر', () => {
        expect(filterTransactionsList(SAMPLE, 'معاملة', TransactionStatus.Active)).toHaveLength(1);
        expect(filterTransactionsList(SAMPLE, 'معاملة', TransactionStatus.Completed)).toHaveLength(1);
        expect(filterTransactionsList(SAMPLE, 'معاملة', TransactionStatus.Paused)).toHaveLength(0);
    });
});
