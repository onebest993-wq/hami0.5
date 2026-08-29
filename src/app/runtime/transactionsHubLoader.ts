type TransactionsOverlayEntryModule =
    typeof import('@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry');

let overlayEntryPromise: Promise<TransactionsOverlayEntryModule> | null = null;
let overlayEntryResolved = false;

export function isTransactionsHubModuleResolved(): boolean {
    return overlayEntryResolved;
}

/** للاختبارات */
export function resetTransactionsHubModuleCacheForTests(): void {
    overlayEntryPromise = null;
    overlayEntryResolved = false;
}

function ensureTransactionsOverlayEntry(): Promise<TransactionsOverlayEntryModule> {
    if (!overlayEntryPromise) {
        overlayEntryPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry'
        )
            .then((mod) => {
                overlayEntryResolved = Boolean(mod.LawyerDashboardTransactionsOverlayEntry);
                return mod;
            })
            .catch((err) => {
                overlayEntryPromise = null;
                overlayEntryResolved = false;
                throw err;
            });
    }
    return overlayEntryPromise;
}

/** مقطع Entry (Host + System ثابتان داخله) — مسار واحد بلا تسخين SystemEntry منفصل */
export function prefetchTransactionsHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureTransactionsOverlayEntry().catch(() => undefined);
}

export function loadTransactionsHubModule(): Promise<TransactionsOverlayEntryModule> {
    return ensureTransactionsOverlayEntry();
}

export function hydrateTransactionsShellForInstantOpen(): Promise<boolean> {
    return ensureTransactionsOverlayEntry()
        .then(() => isTransactionsHubModuleResolved())
        .catch(() => false);
}
