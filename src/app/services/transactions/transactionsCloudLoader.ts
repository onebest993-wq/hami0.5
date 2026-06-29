import type { TransactionsThreadingState } from '@/app/services/cloud/lawyerTransactionTypes';

type TransactionsCloudModule = typeof import('@/app/services/cloud/lawyerTransactionsCloud');

let transactionsCloudModulePromise: Promise<TransactionsCloudModule> | null = null;

function loadTransactionsCloudModule(): Promise<TransactionsCloudModule> {
    if (!transactionsCloudModulePromise) {
        transactionsCloudModulePromise = import('@/app/services/cloud/lawyerTransactionsCloud');
    }
    return transactionsCloudModulePromise;
}

/** جلب حالة Threading — dynamic import لعدم ربط الواجهة بـ lawyer-cloud monolith. */
export async function fetchTransactionsThreadingState(
    userId: string,
): Promise<TransactionsThreadingState | null> {
    const mod = await loadTransactionsCloudModule();
    return mod.TransactionsThreadingDB.getState(userId);
}

/** تحميل مسبق لـ chunk المعاملات */
export function prefetchTransactionsCloudModule(): void {
    if (typeof window === 'undefined') return;
    void loadTransactionsCloudModule();
}

/** للاختبارات — إعادة تعيين cache الوحدة. */
export function resetTransactionsCloudLoaderForTests(): void {
    transactionsCloudModulePromise = null;
}
