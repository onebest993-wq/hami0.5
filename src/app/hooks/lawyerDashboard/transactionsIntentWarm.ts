import { prefetchTransactionsHubModule } from '@/app/runtime/transactionsHubLoader';
import { warmTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { prefetchTransactionsCloudModule } from '@/app/services/transactions/transactionsCloudLoader';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';

let registeredWarmUserId: string | null | undefined;

/** يسجّل userId للـ prefetch من البطاقات دون تمرير صريح */
export function registerTransactionsWarmUserId(userId: string | null | undefined): () => void {
    registeredWarmUserId = userId;
    return () => {
        if (registeredWarmUserId === userId) registeredWarmUserId = undefined;
    };
}

function resolveWarmUserId(explicit?: string | null): string | undefined {
    const uid = (explicit ?? registeredWarmUserId)?.trim();
    return uid || undefined;
}

/** Entry يسحب Host+System ثابتاً — مسار تسخين واحد */
function prefetchTransactionsOpenChain(): void {
    prefetchTransactionsHubModule();
}

/** مخزن البطاقات فوراً — لا idle (كان يؤخر ظهور البطاقات) */
function warmTransactionsDataNow(userId?: string | null): void {
    const uid = resolveWarmUserId(userId);
    if (!uid) return;
    warmTransactionsDiskRead(uid);
    void warmTransactionsThreadingStore(uid).catch(() => undefined);
}

/** السحابة فقط على idle — لا تسرق إطار الفتح. بعد prime/هوية لا تُعاد بيانات. */
export function warmTransactionsCloudIdle(): void {
    scheduleIdleWork(() => prefetchTransactionsCloudModule(), { minDelayMs: 0, timeoutMs: 5_000 });
}

/**
 * pointerdown/hover — chunks فوراً.
 * البيانات على غير-lite فقط؛ السحابة تُترك للفتح.
 * لا dispatchPrime هنا (البلاطة تُطلقه) — تجنّب حلقة warm↔prime تؤخّر الفتح.
 */
export function warmTransactionsOnHover(userId?: string | null): void {
    prefetchTransactionsOpenChain();
    if (isLitePerformanceActive()) return;
    warmTransactionsDataNow(userId);
}

/** فتح صريح — سلسلة كاملة + بيانات + سحابة idle */
export function warmTransactionsOnOpen(userId?: string | null): void {
    prefetchTransactionsOpenChain();
    warmTransactionsDataNow(userId);
    warmTransactionsCloudIdle();
}

/** تسخين خفيف قبل الفتح — chunks + مخزن إن وُجد userId */
export function primeTransactionsShellForOpen(userId?: string | null): void {
    prefetchTransactionsOpenChain();
    warmTransactionsDataNow(userId);
}
