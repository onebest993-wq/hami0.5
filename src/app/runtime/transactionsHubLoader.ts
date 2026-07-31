import type { ComponentType } from 'react';

type TransactionsHubModule =
    typeof import('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystemEntry');

export type TransactionsThreadingSystemProps = {
    onBack: () => void;
    userId: string;
    initialTransactionId?: string;
    open?: boolean;
    /** مركّب مخفياً — الشجرة دافئة؛ الفتح = إظهار فقط */
    keepAlive?: boolean;
};

export type TransactionsThreadingSystemComponent = ComponentType<TransactionsThreadingSystemProps>;

let hubModulePromise: Promise<TransactionsHubModule> | null = null;
let cachedTransactionsThreadingSystem: TransactionsThreadingSystemComponent | null = null;

export function isTransactionsHubModuleResolved(): boolean {
    return cachedTransactionsThreadingSystem !== null;
}

export function getCachedTransactionsThreadingSystem(): TransactionsThreadingSystemComponent | null {
    return cachedTransactionsThreadingSystem;
}

/** للاختبارات */
export function resetTransactionsHubModuleCacheForTests(): void {
    hubModulePromise = null;
    cachedTransactionsThreadingSystem = null;
}

function ensureTransactionsHubModulePromise(): Promise<TransactionsHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = import('@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystemEntry')
            .then((mod) => {
                if (mod.default) {
                    cachedTransactionsThreadingSystem = mod.default;
                }
                return mod;
            })
            .catch((err) => {
                hubModulePromise = null;
                throw err;
            });
    }
    return hubModulePromise;
}

export function prefetchTransactionsHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureTransactionsHubModulePromise().catch(() => undefined);
}

export function loadTransactionsHubModule(): Promise<TransactionsHubModule> {
    return ensureTransactionsHubModulePromise();
}

export function hydrateTransactionsShellForInstantOpen(): Promise<boolean> {
    return ensureTransactionsHubModulePromise()
        .then(() => true)
        .catch(() => false);
}
