/** تسخين مقاطع كسل — نفس المحدّدات التي يستخدمها lazy() حتى يشارك Vite المقطع */

const IDLE_FALLBACK_MS = 180;
const IDLE_TIMEOUT_MS = 1500;

let detailsScreenPromise: Promise<unknown> | null = null;

export function scheduleTransactionsIdle(work: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
        const id = ric(() => work(), { timeout: IDLE_TIMEOUT_MS });
        return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(work, IDLE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
}

export function prefetchTransactionsDetailsScreen(): Promise<unknown> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (!detailsScreenPromise) {
        detailsScreenPromise = import('./TransactionDetailsScreen').catch((error: unknown) => {
            detailsScreenPromise = null;
            throw error;
        });
    }
    return detailsScreenPromise;
}

export function prefetchAddTransactionBottomSheet(): void {
    if (typeof window === 'undefined') return;
    void import('./AddTransactionBottomSheet');
}

export function prefetchDocumentsTabView(): void {
    if (typeof window === 'undefined') return;
    void import('./DocumentsTabView');
}

export function prefetchAddTaskBottomSheet(): void {
    if (typeof window === 'undefined') return;
    void import('./AddTaskBottomSheet');
}

export function prefetchTaskThreadDialogs(): void {
    if (typeof window === 'undefined') return;
    void import('./taskThread/TaskThreadDialogs');
}

export function prefetchTransactionDetailsDialogs(): void {
    if (typeof window === 'undefined') return;
    void import('./transactionDetails/TransactionDetailsDialogs');
}

export function prefetchShareProcedureModal(): void {
    if (typeof window === 'undefined') return;
    void import('./ShareProcedureModal');
}

/** مسار الإجراءات فقط — بلا مشاركة منتدى */
export function prefetchTransactionsPathOverlays(): void {
    prefetchAddTaskBottomSheet();
    prefetchTaskThreadDialogs();
}
