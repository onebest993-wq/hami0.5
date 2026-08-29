/**
 * تنبيهات مهل مهام المعاملات — Direct producer.
 *
 * تنبيهات أتعاب/دفعات المعاملات أُلغيت مع تبويب المالية المهجور.
 * تنبيهات execution payments تبقى في buildExecutionAlerts.
 */

import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { TransactionTask } from '@/app/modules/transactionsThreading/types';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function safeStr(v: unknown): string {
    return typeof v === 'string' ? v.trim() : '';
}

function parseTs(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const d = new Date(value);
    const t = d.getTime();
    return Number.isFinite(t) ? t : null;
}

export function buildFinancialAlerts(tasks: TransactionTask[], now: Date): SecretaryAlert[] {
    const out: SecretaryAlert[] = [];
    const nowTs = now.getTime();

    for (const task of tasks) {
        if (
            task.status === TransactionTaskStatus.Done ||
            task.status === TransactionTaskStatus.Blocked
        ) {
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
