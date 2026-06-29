import { loadTransactionsHubModule } from '@/app/runtime/transactionsHubLoader';
import { warmTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { prefetchTransactionsCloudModule } from '@/app/services/transactions/transactionsCloudLoader';

let registeredWarmUserId: string | null | undefined;

/** يسجّل userId للـ prefetch من البطاقات دون تمرير صريح */
export function registerTransactionsWarmUserId(userId: string | null | undefined): () => void {
    registeredWarmUserId = userId;
    return () => {
        if (registeredWarmUserId === userId) registeredWarmUserId = undefined;
    };
}

/** عند hover/لمس بطاقة المعاملات: prefetch للـ chunk فقط */
export function warmTransactionsOnHover(): void {
    void loadTransactionsHubModule().catch(() => undefined);
    prefetchTransactionsCloudModule();
}

/** عند فتح مركز المعاملات — يُكمَّل بتهيئة مخزن البيانات */
export function warmTransactionsOnOpen(userId?: string | null): void {
    warmTransactionsOnHover();
    const uid = (userId ?? registeredWarmUserId)?.trim();
    if (uid) void warmTransactionsThreadingStore(uid).catch(() => undefined);
}
