/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 *
 * النقاط هنا: Threading + خطوات المعاملات القديمة (steps.appointmentDate).
 * المستعجل/ميدان/ملاحظات: مساراتها في urgentSync / incrementalSync.
 */
import {
    CalendarBridge,
    flushPendingCalendarSyncs,
    normalizeDateToYmd,
    resolveCalendarUserId,
} from '@/app/services/calendar/bridge';
import { TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';
import { TransactionTaskStatus } from '@/app/modules/transactionsThreading/types';
import { debug } from '@/app/utils/debug';
import type { DossierSyncStats } from './types';
import { isRecord, readStr } from './shared';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';

const TRANSACTIONS_LOCAL_KEY = 'hami:transactions:v1';

/** قراءة محلية خفيفة — بدون سحابة في المسار الساخن للتقويم */
export function loadTransactionsLocalForCalendar(userId: string): unknown[] {
    const uid = String(userId ?? '').trim();
    if (!uid) return [];
    try {
        const raw = readSecureOrDrainLegacySync(TRANSACTIONS_LOCAL_KEY);
        if (!raw?.trim()) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((t) => isRecord(t) && String(t.userId ?? '') === uid);
    } catch {
        return [];
    }
}

function stepAppointmentYmd(step: Record<string, unknown>): string | null {
    const raw = step.appointmentDate;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return normalizeDateToYmd(raw.toISOString());
    }
    if (typeof raw === 'string') return normalizeDateToYmd(raw);
    return null;
}

/** مواعيد خطوات المعاملات القديمة (TransactionDB.steps.appointmentDate) */
export function syncTransactionsCalendarSnapshot(
    userId: string | null | undefined,
    transactions: unknown[],
    stats: DossierSyncStats,
): void {
    const uid = resolveCalendarUserId(userId);
    for (const tx of transactions) {
        if (!isRecord(tx)) continue;
        const txId = String(tx.id ?? '').trim();
        if (!txId) continue;
        const clientName = readStr(tx, 'clientName') || undefined;
        const txTitle = readStr(tx, 'transactionType') || readStr(tx, 'title') || 'معاملة';
        const steps = Array.isArray(tx.steps) ? tx.steps : [];
        for (const step of steps) {
            if (!isRecord(step)) continue;
            const stepId = String(step.id ?? '').trim();
            if (!stepId) continue;
            const ymd = stepAppointmentYmd(step);
            if (!ymd) {
                CalendarBridge.remove('transaction', txId, stepId, uid);
                continue;
            }
            const label = readStr(step, 'label') || txTitle;
            const time =
                typeof step.appointmentTime === 'string' && step.appointmentTime.trim()
                    ? step.appointmentTime.trim()
                    : undefined;
            CalendarBridge.syncTransactionAppointment({
                userId: uid,
                transactionId: txId,
                stepId,
                date: ymd,
                time,
                title: label,
                clientName,
            });
            stats.transactionSteps++;
        }
    }
}

export async function syncTransactions(userId: string, stats: DossierSyncStats): Promise<void> {
    const uid = resolveCalendarUserId(userId);
    try {
        syncTransactionsCalendarSnapshot(uid, loadTransactionsLocalForCalendar(uid), stats);
    } catch (err) {
        debug.warn('[calendarDossierSync] transactions sync failed:', err);
    }
}

export function syncThreadingCalendarSnapshot(
    userId: string | null | undefined,
    transactions: unknown[],
    tasks: unknown[],
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
    void flushPendingCalendarSyncs();
}

export async function syncThreadingTasks(userId: string, stats: DossierSyncStats): Promise<void> {
    try {
        const state = await TransactionsThreadingDB.getState(userId);
        const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
        const tasks = Array.isArray(state?.tasks) ? state.tasks : [];
        syncThreadingCalendarSnapshot(userId, transactions, tasks);
        stats.threadingTasks += tasks.length;
    } catch (err) {
        debug.warn('[calendarDossierSync] threading scan failed:', err);
    }
}
