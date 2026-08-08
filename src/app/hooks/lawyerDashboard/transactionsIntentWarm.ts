import { loadTransactionsHubModule, prefetchTransactionsHubModule } from '@/app/runtime/transactionsHubLoader';
import { warmTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { prefetchTransactionsCloudModule } from '@/app/services/transactions/transactionsCloudLoader';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

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

/** Entry + Host + System — يمنع waterfall ثلاثي على أول ضغط */
function prefetchTransactionsOpenChain(): void {
    prefetchTransactionsHubModule();
    void loadTransactionsHubModule().catch(() => undefined);
    void import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry'
    ).catch(() => undefined);
    void import('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost').catch(
        () => undefined,
    );
}

/** مخزن البطاقات فوراً — لا idle (كان يؤخر ظهور البطاقات) */
function warmTransactionsDataNow(userId?: string | null): void {
    const uid = resolveWarmUserId(userId);
    if (!uid) return;
    warmTransactionsDiskRead(uid);
    void warmTransactionsThreadingStore(uid).catch(() => undefined);
}

/** السحابة فقط على idle — لا تسرق إطار الفتح */
function warmTransactionsCloudIdle(): void {
    scheduleIdleWork(() => prefetchTransactionsCloudModule(), { minDelayMs: 0, timeoutMs: 5_000 });
}

/**
 * pointerdown/hover — سلسلة chunks + بيانات البطاقات فوراً.
 * لا dispatchPrime هنا (البلاطة تُطلقه) — تجنّب حلقة warm↔prime تؤخّر الفتح.
 */
export function warmTransactionsOnHover(userId?: string | null): void {
    prefetchTransactionsOpenChain();
    warmTransactionsDataNow(userId);
    warmTransactionsCloudIdle();
}

/**
 * عند فتح المركز — chunk + مخزن فوري حتى تظهر البطاقات مع الهيكل.
 */
export function warmTransactionsOnOpen(userId?: string | null): void {
    prefetchTransactionsOpenChain();
    warmTransactionsDataNow(userId);
    warmTransactionsCloudIdle();
}

/** تسخين خفيف قبل الفتح — chunks + مخزن إن وُجد userId مسجّل */
export function primeTransactionsShellForOpen(): void {
    prefetchTransactionsOpenChain();
    warmTransactionsDataNow();
}
