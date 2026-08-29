import { ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import SecureStoreService from '@/app/services/SecureStoreService';

const TRANSACTIONS_LOCAL_KEY = 'hami:transactions:v1';

function transactionsThreadingKey(userId: string): string {
    return `hami:transactionsThreading:v1:${userId}`;
}

/**
 * قراءة معاملات محلية فوراً (localStorage/SecureStore) — قبل flushSync عند الفتح.
 * يمنع وميض «لا معاملات» قبل اكتمال refresh async.
 */
export function warmTransactionsDiskRead(userId: string | null | undefined): void {
    const uid = userId?.trim();
    if (!uid) return;
    void SecureStoreService.warmKeys([TRANSACTIONS_LOCAL_KEY, transactionsThreadingKey(uid)]);
    ensureTransactionsUserBound(uid);
}
