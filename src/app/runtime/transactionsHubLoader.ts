type TransactionsHubModule = typeof import('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem');

let hubModulePromise: Promise<TransactionsHubModule> | null = null;

export function prefetchTransactionsHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadTransactionsHubModule().catch(() => undefined);
}

export function loadTransactionsHubModule(): Promise<TransactionsHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = import('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem');
    }
    return hubModulePromise;
}
