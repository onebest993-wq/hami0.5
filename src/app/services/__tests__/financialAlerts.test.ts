/**
 * اختبارات buildFinancialAlerts.
 *
 * يتحقّق من:
 *  fi1) معاملة نشطة بـ agreedFees بدون دفعات > 30 يوم → TASK outstanding
 *  fi2) معاملة بدفعة جزئية قبل 60 يوم + outstanding > 0 → TASK
 *  fi3) معاملة مكتملة (Completed) لا تُنتج
 *  fi4) معاملة بدون أتعاب لا تُنتج
 *  fi5) معاملة مدفوعة بالكامل لا تُنتج
 *  fi6) TransactionTask deadline قريب → DEADLINE
 *  fi7) TransactionTask Blocked لا يُنتج (يتولّاه buildThreadingAlerts)
 */
import { describe, expect, it } from 'vitest';
import { buildFinancialAlerts } from '../financialAlerts';
import {
    TransactionStatus,
    FinanceRecordType,
    TransactionTaskStatus,
    type Transaction,
    type FinanceRecord,
    type TransactionTask,
} from '@/app/modules/transactionsThreading/types';

function isoInDays(daysFromNow: number): string {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function makeTx(overrides: Partial<Transaction>): Transaction {
    return {
        id: 'tx-1',
        title: 'تسجيل عقار',
        clientName: 'الموكل',
        targetDepartment: 'الطابو',
        status: TransactionStatus.Active,
        agreedFees: 1_000_000,
        createdAt: isoInDays(-45),
        updatedAt: isoInDays(-10),
        ...overrides,
    };
}

describe('buildFinancialAlerts', () => {
    it('fi1) Active + agreedFees > 0 + no payments + age > 30 days → TASK outstanding', () => {
        const tx = makeTx({ id: 'tx-fi1', createdAt: isoInDays(-45) });
        const alerts = buildFinancialAlerts([tx], [], [], new Date());
        const hit = alerts.find((a) => a.id === 'financial:outstanding:tx-fi1');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('TASK');
        expect(hit?.target).toBe('transactions');
        expect(hit?.priority).toBeGreaterThanOrEqual(3);
    });

    it('fi2) دفعة جزئية قبل 60 يوم + outstanding > 0 → TASK', () => {
        const tx = makeTx({ id: 'tx-fi2' });
        const recs: FinanceRecord[] = [
            {
                id: 'r1',
                transactionId: 'tx-fi2',
                type: FinanceRecordType.AdvancePayment,
                amount: 200_000,
                description: 'دفعة أولى',
                date: isoInDays(-65),
            },
        ];
        const alerts = buildFinancialAlerts([tx], recs, [], new Date());
        const hit = alerts.find((a) => a.id === 'financial:outstanding:tx-fi2');
        expect(hit).toBeDefined();
    });

    it('fi3) Completed لا يُنتج', () => {
        const tx = makeTx({ id: 'tx-fi3', status: TransactionStatus.Completed });
        const alerts = buildFinancialAlerts([tx], [], [], new Date());
        expect(alerts.find((a) => a.id.includes('tx-fi3'))).toBeUndefined();
    });

    it('fi4) بدون أتعاب لا يُنتج', () => {
        const tx = makeTx({ id: 'tx-fi4', agreedFees: 0 });
        const alerts = buildFinancialAlerts([tx], [], [], new Date());
        expect(alerts.find((a) => a.id.includes('tx-fi4'))).toBeUndefined();
    });

    it('fi5) مدفوعة بالكامل لا تُنتج', () => {
        const tx = makeTx({ id: 'tx-fi5', agreedFees: 1_000_000 });
        const recs: FinanceRecord[] = [
            {
                id: 'r',
                transactionId: 'tx-fi5',
                type: FinanceRecordType.AdvancePayment,
                amount: 1_000_000,
                description: 'كامل',
                date: isoInDays(-40),
            },
        ];
        const alerts = buildFinancialAlerts([tx], recs, [], new Date());
        expect(alerts.find((a) => a.id.includes('tx-fi5'))).toBeUndefined();
    });

    it('fi6) TransactionTask.deadline خلال 3 أيام → DEADLINE', () => {
        const tx = makeTx({ id: 'tx-fi6', status: TransactionStatus.Completed });
        // ملاحظة: completed لا يُولّد outstanding، لكن task مستقل
        const task: TransactionTask = {
            id: 'task-1',
            transactionId: 'tx-fi6',
            title: 'تقديم مستند',
            status: TransactionTaskStatus.Pending,
            parentTaskId: null,
            notes: null,
            deadline: isoInDays(3),
            officialReference: null,
            createdAt: isoInDays(-1),
            completedAt: null,
        };
        const alerts = buildFinancialAlerts([tx], [], [task], new Date());
        const hit = alerts.find((a) => a.id === 'financial:task:task-1');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('DEADLINE');
        expect(hit?.priority).toBeLessThanOrEqual(2);
    });

    it('fi7) Blocked task لا يُنتج (يتولّاه buildThreadingAlerts)', () => {
        const tx = makeTx({ id: 'tx-fi7' });
        const task: TransactionTask = {
            id: 'task-blk',
            transactionId: 'tx-fi7',
            title: 'معطّلة',
            status: TransactionTaskStatus.Blocked,
            parentTaskId: null,
            notes: null,
            deadline: isoInDays(3),
            officialReference: null,
            createdAt: isoInDays(-1),
            completedAt: null,
        };
        const alerts = buildFinancialAlerts([], [], [task], new Date());
        expect(alerts.find((a) => a.id === 'financial:task:task-blk')).toBeUndefined();
    });
});
