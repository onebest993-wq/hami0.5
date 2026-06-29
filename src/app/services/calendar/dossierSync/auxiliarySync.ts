/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 *
 * ملاحظة WHITELIST: مساري المستعجل (urgent) والمعاملات (transactions) مُعطَّلان
 * عمداً ولا يُسجَّلان في التقويم. النقاط المسموحة هنا: مهام/حركات Threading فقط.
 */
import {
    CalendarBridge,
    flushPendingCalendarSyncs,
    normalizeDateToYmd,
    resolveCalendarUserId,
} from '@/app/services/calendarBridge';
import { TransactionsThreadingDB } from '@/app/services/lawyer-cloud';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { debug } from '@/app/utils/debug';
import type { DossierSyncStats } from './types';
import { isRecord, readStr } from './shared';


export function syncThreadingCalendarSnapshot(
    userId: string | null | undefined,
    transactions: unknown[],
    tasks: unknown[],
    financeRecords: unknown[] = [],
): void {
    const uid = resolveCalendarUserId(userId);
    const txById = new Map<string, Record<string, unknown>>();
    for (const tx of transactions) {
        if (tx && typeof tx === 'object') {
            txById.set(String((tx as { id?: string }).id ?? ''), tx as Record<string, unknown>);
        }
    }
    for (const task of tasks) {
        if (!isRecord(task)) continue;
        const taskId = String(task.id ?? '').trim();
        const txId = String(task.transactionId ?? '').trim();
        if (!taskId || !txId) continue;
        if (String(task.status ?? '') === TransactionTaskStatus.Done) {
            CalendarBridge.remove('threading', txId, `task_${taskId}`, uid);
            continue;
        }
        const deadline = normalizeDateToYmd(typeof task.deadline === 'string' ? task.deadline : undefined);
        if (!deadline) {
            CalendarBridge.remove('threading', txId, `task_${taskId}`, uid);
            continue;
        }
        const tx = txById.get(txId);
        CalendarBridge.syncThreadingTask({
            userId: uid,
            transactionId: txId,
            taskId,
            title: readStr(task, 'title') || (tx ? readStr(tx, 'title') : '') || 'مهمة',
            dueDate: deadline,
            clientName: tx ? readStr(tx, 'clientName') || undefined : undefined,
        });
    }
    for (const rec of financeRecords) {
        if (!isRecord(rec)) continue;
        const recordId = String(rec.id ?? '').trim();
        const txId = String(rec.transactionId ?? '').trim();
        if (!recordId || !txId) continue;
        const ymd = normalizeDateToYmd(typeof rec.date === 'string' ? rec.date : undefined);
        if (!ymd) {
            CalendarBridge.remove('threading', txId, `finance_${recordId}`, uid);
            continue;
        }
        const tx = txById.get(txId);
        const financeType =
            String(rec.type ?? '') === 'AdvancePayment' ? 'advance' : 'expense';
        CalendarBridge.syncThreadingFinance({
            userId: uid,
            transactionId: txId,
            recordId,
            title: readStr(rec, 'description') || 'حركة مالية',
            date: ymd,
            clientName: tx ? readStr(tx, 'clientName') || undefined : undefined,
            financeType,
        });
    }
    void flushPendingCalendarSyncs();
}

export async function syncThreadingTasks(userId: string, stats: DossierSyncStats): Promise<void> {
    try {
        const state = await TransactionsThreadingDB.getState(userId);
        const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
        const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
        const financeRecords = Array.isArray(state?.financeRecords) ? state.financeRecords : [];
        syncThreadingCalendarSnapshot(userId, transactions, tasks, financeRecords);
        stats.threadingTasks += tasks.length;
    } catch (err) {
        debug.warn('[calendarDossierSync] threading scan failed:', err);
    }
}

