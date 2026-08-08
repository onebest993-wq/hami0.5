import type { SparkNudge } from '@/app/spark/types';
import {
    TransactionStatus,
    TransactionTaskStatus,
    type Transaction,
    type TransactionTask,
} from '@/app/modules/transactionsThreading/types';

export type ThreadingSparkHit = {
    transactionId: string;
    dossierKey: string;
    caseLabel: string;
    nudge: SparkNudge;
};

function isActiveTransaction(tx: Transaction): boolean {
    return !tx.archivedAt && !tx.deletedAt && tx.status !== TransactionStatus.Completed;
}

function parseTransaction(raw: unknown): Transaction | null {
    if (!raw || typeof raw !== 'object') return null;
    const tx = raw as Transaction;
    if (!tx.id) return null;
    return tx;
}

function parseTask(raw: unknown): TransactionTask | null {
    if (!raw || typeof raw !== 'object') return null;
    const task = raw as TransactionTask;
    if (!task.id || !task.transactionId) return null;
    return task;
}

function daysUntilDeadline(deadline: string | null): number | null {
    if (!deadline) return null;
    const ts = Date.parse(deadline);
    if (!Number.isFinite(ts)) return null;
    return Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
}

/** مسح خفيف لمعاملات الخيط الإداري */
export function scanThreadingForSpark(
    transactions: unknown[],
    tasks: unknown[],
    options?: { maxHits?: number },
): ThreadingSparkHit[] {
    const maxHits = options?.maxHits ?? 16;
    const hits: ThreadingSparkHit[] = [];
    const txById = new Map<string, Transaction>();

    for (const raw of transactions) {
        const tx = parseTransaction(raw);
        if (!tx || !isActiveTransaction(tx)) continue;
        txById.set(tx.id, tx);
    }

    for (const raw of tasks) {
        if (hits.length >= maxHits) break;
        const task = parseTask(raw);
        if (!task || task.status === TransactionTaskStatus.Done) continue;
        const tx = txById.get(task.transactionId);
        if (!tx) continue;

        const label = String(tx.title ?? tx.clientName ?? 'معاملة').trim() || 'معاملة';
        const days = daysUntilDeadline(task.deadline);

        if (task.status === TransactionTaskStatus.Blocked) {
            hits.push(makeHit(tx, task, label, 'threading.task_blocked', 8, `مهمة معلّقة في «${label}»: ${task.title}`));
            continue;
        }

        if (days != null && days <= 3) {
            hits.push(
                makeHit(
                    tx,
                    task,
                    label,
                    'threading.task_deadline_near',
                    days < 0 ? 9 : 6,
                    days < 0
                        ? `مهلة مهمة في «${label}» انتهت — ${task.title}`
                        : `مهمة في «${label}» تستحق خلال ${days} يوماً — ${task.title}`,
                ),
            );
        }
    }

    for (const tx of txById.values()) {
        if (hits.length >= maxHits) break;
        if (tx.status !== TransactionStatus.Paused) continue;
        hits.push({
            transactionId: tx.id,
            dossierKey: `threading:${tx.id}`,
            caseLabel: String(tx.title ?? tx.clientName ?? 'معاملة').trim() || 'معاملة',
            nudge: {
                id: `threading-paused:${tx.id}`,
                kind: 'threading.transaction_paused',
                surface: 'threading',
                priority: 5,
                message: `معاملة «${tx.title ?? tx.clientName}» متوقفة — هل تود استئنافها؟`,
                presence: { present: ['معاملة نشطة سابقاً'], missing: ['استئناف المعاملة'] },
                source: 'threadingSparkScan',
                dossierKey: `threading:${tx.id}`,
                targetFileId: tx.id,
                action: { label: 'فتح المعاملة', actionId: 'open_threading' },
            },
        });
    }

    return hits.sort((a, b) => b.nudge.priority - a.nudge.priority);
}

function makeHit(
    tx: Transaction,
    task: TransactionTask,
    label: string,
    kind: SparkNudge['kind'],
    priority: number,
    message: string,
): ThreadingSparkHit {
    return {
        transactionId: tx.id,
        dossierKey: `threading:${tx.id}`,
        caseLabel: label,
        nudge: {
            id: `threading-task:${task.id}:${kind}`,
            kind,
            surface: 'threading',
            priority,
            message,
            presence: {
                present: task.deadline ? [`مهلة: ${task.deadline.slice(0, 10)}`] : [],
                missing: [String(task.title ?? 'مهمة معاملة')],
            },
            source: 'threadingSparkScan',
            dossierKey: `threading:${tx.id}`,
            targetFileId: tx.id,
            action: { label: 'فتح المعاملة', actionId: 'open_threading' },
        },
    };
}

export function buildThreadingArchiveAttentionNudge(hits: ThreadingSparkHit[]): SparkNudge | null {
    if (!hits.length) return null;
    const first = hits[0];
    const count = hits.length;
    const message =
        count === 1
            ? first.nudge.message
            : `يبدو أن ${count} معاملات تحتاج متابعة — أولها: ${first.caseLabel}. هل يهمك الأمر؟`;

    return {
        id: `threading-archive-attention:${first.transactionId}`,
        kind: 'threading.archive_attention_summary',
        surface: 'threading',
        priority: 5,
        message,
        presence: {
            present: [`${count} معاملة في المسح`],
            missing: ['متابعة إدارية'],
        },
        source: 'threadingSparkScan',
        dossierKey: first.dossierKey,
        targetFileId: first.transactionId,
        hitCount: count,
        action: { label: 'فتح المعاملات', actionId: 'open_threading_hub' },
    };
}
