import { TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';
import type { TransactionsThreadingState } from '@/app/services/cloud/lawyerTransactionTypes';

/** جلب حالة Threading — dynamic import لعدم ربط الواجهة بـ lawyer-cloud monolith. */
export async function fetchTransactionsThreadingState(
    userId: string,
): Promise<TransactionsThreadingState | null> {
    return TransactionsThreadingDB.getState(userId);
}

/** المسار صار مربوطاً مباشرة، فالتسخين هنا no-op متوافق مع الاستدعاءات القائمة. */
export function prefetchTransactionsCloudModule(): void {
    void TransactionsThreadingDB;
}

/** للاختبارات — لا توجد cache ديناميكية بعد الآن. */
export function resetTransactionsCloudLoaderForTests(): void {
    /* no-op */
}
