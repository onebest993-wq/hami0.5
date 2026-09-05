import { ensureTransactionsUserBound } from '@/app/modules/transactionsThreading/store';
import SecureStoreService from '@/app/services/SecureStoreService';

export const TRANSACTIONS_THREADING_DISK_READY_EVENT = 'hami:tx-threading-disk-ready';

function transactionsThreadingKey(userId: string): string {
    return `hami:transactionsThreading:v1:${userId}`;
}

/** أصل مشفَّر لم يُفك بعد — peek يعطي فارغاً وليس «لا معاملات». */
export function isTransactionsThreadingDiskUnread(userId: string | null | undefined): boolean {
    const uid = userId?.trim();
    if (!uid) return false;
    try {
        return SecureStoreService.isUnreadSync(transactionsThreadingKey(uid));
    } catch {
        return false;
    }
}

export function subscribeTransactionsThreadingDiskReady(onReady: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener(TRANSACTIONS_THREADING_DISK_READY_EVENT, onReady);
    return () => window.removeEventListener(TRANSACTIONS_THREADING_DISK_READY_EVENT, onReady);
}

function notifyTransactionsThreadingDiskReady(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(TRANSACTIONS_THREADING_DISK_READY_EVENT));
}

/**
 * فك مفتاح الخيوط ثم إعادة الربط — peek المتزامن قبل فكّ ciphertext يعطي قائمة فارغة.
 * كيس السجل المسطح القديم للتقويم لا يُسخَّن هنا؛ القائمة تقرأ الخيوط فقط.
 */
export function warmTransactionsDiskRead(userId: string | null | undefined): void {
    const uid = userId?.trim();
    if (!uid) return;
    ensureTransactionsUserBound(uid);
    if (!isTransactionsThreadingDiskUnread(uid)) {
        notifyTransactionsThreadingDiskReady();
        return;
    }
    void SecureStoreService.warmKeys([transactionsThreadingKey(uid)])
        .then(() => {
            ensureTransactionsUserBound(uid);
        })
        .finally(() => {
            notifyTransactionsThreadingDiskReady();
        });
}
