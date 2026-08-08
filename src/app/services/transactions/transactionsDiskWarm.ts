import { ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';

/**
 * قراءة معاملات محلية فوراً (localStorage/SecureStore) — قبل flushSync عند الفتح.
 * يمنع وميض «لا معاملات» قبل اكتمال refresh async.
 */
export function warmTransactionsDiskRead(userId: string | null | undefined): void {
    const uid = userId?.trim();
    if (!uid) return;
    ensureTransactionsUserBound(uid);
}
