/**
 * تنبيهات مالية — Direct producer.
 *
 * يُولّد تنبيهات لـ:
 *  - Threading transactions: أتعاب غير مدفوعة بالكامل + لا دفعة منذ > 30 يوم
 *  - Threading FinanceRecords: تتبّع آخر دفعة advance لكل معاملة
 *
 * ملاحظة: تنبيهات execution payments مدمجة بالفعل في buildExecutionAlerts (#10).
 */

import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type {
    Transaction,
    TransactionTask,
    FinanceRecord,
} from '@/app/modules/transactionsThreading/types';
import {
    TransactionStatus,
    FinanceRecordType,
    TransactionTaskStatus,
} from '@/app/modules/transactionsThreading/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_PAYMENT_DAYS = 30;

function safeStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

function parseTs(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const d = new Date(value);
    const t = d.getTime();
    return Number.isFinite(t) ? t : null;
}

function priorityByDaysOverdue(daysOverdue: number): number {
    if (daysOverdue >= 90) return 2;
    if (daysOverdue >= 60) return 3;
    return 4;
}

export function buildFinancialAlerts(
    transactions: Transaction[],
    financeRecords: FinanceRecord[],
    tasks: TransactionTask[],
    now: Date,
): SecretaryAlert[] {
    const out: SecretaryAlert[] = [];
    const nowTs = now.getTime();

    // فهرس FinanceRecords حسب transactionId
    const recordsByTx = new Map<string, FinanceRecord[]>();
    for (const r of financeRecords) {
        const list = recordsByTx.get(r.transactionId) ?? [];
        list.push(r);
        recordsByTx.set(r.transactionId, list);
    }

    for (const tx of transactions) {
        if (tx.status === TransactionStatus.Completed) continue;
        if (!tx.agreedFees || tx.agreedFees <= 0) continue;

        const records = recordsByTx.get(tx.id) ?? [];
        const advances = records.filter((r) => r.type === FinanceRecordType.AdvancePayment);
        const paid = advances.reduce((sum, r) => sum + (r.amount || 0), 0);
        const outstanding = tx.agreedFees - paid;
        if (outstanding <= 0) continue;

        // آخر دفعة advance
        let lastPaymentTs: number | null = null;
        for (const a of advances) {
            const t = parseTs(a.date);
            if (t != null && (lastPaymentTs === null || t > lastPaymentTs)) lastPaymentTs = t;
        }
        // إن لم تكن هناك دفعات، نستخدم createdAt للمعاملة كأساس
        const anchorTs = lastPaymentTs ?? parseTs(tx.createdAt);
        if (anchorTs == null) continue;

        const daysSinceLastActivity = Math.floor((nowTs - anchorTs) / DAY_MS);
        if (daysSinceLastActivity < STALE_PAYMENT_DAYS) continue;

        const clientName = safeStr(tx.clientName) || 'موكل';
        const txLabel = safeStr(tx.title) || 'معاملة إدارية';
        const dueAt = new Date(nowTs + DAY_MS).toISOString();
        const reason = lastPaymentTs
            ? `لم تُسجَّل دفعة منذ ${daysSinceLastActivity} يوماً`
            : `لم تُسجَّل أي دفعة منذ إنشاء المعاملة (${daysSinceLastActivity} يوماً)`;

        out.push({
            id: `financial:outstanding:${tx.id}`,
            type: 'TASK',
            title: `أتعاب غير محصّلة — ${txLabel}`,
            summary: `${clientName} • متبقّي ${outstanding.toLocaleString()} د.ع`,
            dueAt,
            suggestedAction: 'فتح المعاملة لتسجيل دفعة أو متابعة الموكل',
            aiDeepDive: `${reason}. الأتعاب المتفق عليها ${tx.agreedFees.toLocaleString()} د.ع — المتبقّي ${outstanding.toLocaleString()} د.ع.`,
            target: 'transactions',
            entityId: tx.id,
            priority: priorityByDaysOverdue(daysSinceLastActivity),
            clientName,
        });
    }

    // مهام معاملات بـ deadline قريب أو متجاوزة
    for (const task of tasks) {
        if (
            task.status === TransactionTaskStatus.Done ||
            task.status === TransactionTaskStatus.Blocked
        ) {
            // Blocked يُعالَج في buildThreadingAlerts بالفعل
            continue;
        }
        if (!task.deadline) continue;
        const ts = parseTs(task.deadline);
        if (ts == null) continue;
        const days = Math.floor((ts - nowTs) / DAY_MS);
        if (days < -3 || days > 14) continue;

        const priority = days <= 1 ? 1 : days <= 3 ? 2 : days <= 7 ? 3 : 4;
        out.push({
            id: `financial:task:${task.id}`,
            type: 'DEADLINE',
            title: `مهلة مهمة — ${safeStr(task.title) || 'مهمة معاملة'}`,
            summary: days >= 0 ? `خلال ${days} يوماً` : `متجاوزة بـ ${-days} يوماً`,
            dueAt: new Date(ts).toISOString(),
            suggestedAction: 'فتح المعاملة',
            aiDeepDive: safeStr(task.notes) || 'مهمة في معاملة إدارية تقترب من موعدها.',
            target: 'transactions',
            entityId: task.transactionId,
            priority,
        });
    }

    return out;
}
