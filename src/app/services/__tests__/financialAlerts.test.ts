/**
 * اختبارات buildFinancialAlerts — مهل مهام المعاملات فقط.
 *
 *  fi6) TransactionTask deadline قريب → DEADLINE
 *  fi7) TransactionTask Blocked لا يُنتج تنبيه مهلة
 */
import { describe, expect, it } from 'vitest';
import { buildFinancialAlerts } from '../financialAlerts';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';

function isoInDays(daysFromNow: number): string {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

describe('buildFinancialAlerts', () => {
    it('fi6) TransactionTask.deadline خلال 3 أيام → DEADLINE', () => {
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
        const alerts = buildFinancialAlerts([task], new Date());
        const hit = alerts.find((a) => a.id === 'financial:task:task-1');
        expect(hit).toBeDefined();
        expect(hit?.type).toBe('DEADLINE');
        expect(hit?.priority).toBeLessThanOrEqual(2);
    });

    it('fi7) Blocked task لا يُنتج تنبيه مهلة', () => {
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
        const alerts = buildFinancialAlerts([task], new Date());
        expect(alerts.find((a) => a.id === 'financial:task:task-blk')).toBeUndefined();
    });
});
