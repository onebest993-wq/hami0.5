import {
    prefetchHubArchiveIntent,
    type HubArchivePrefetchPhase,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch';

const HUB_ARCHIVE_PREFETCH_COOLDOWN_MS = 300;
const lastPrefetchAt = new Map<string, number>();
let transactionIdleScheduled = false;

export function resetHubArchivePrefetchGateForTests(): void {
    lastPrefetchAt.clear();
    transactionIdleScheduled = false;
}

function runPrefetch(archiveId: string, phase: HubArchivePrefetchPhase, userId?: string | null): void {
    prefetchHubArchiveIntent(archiveId, phase, userId);
}

/** prefetch واحد لكل archive كل ~300ms — hover بطاقة hub */
export function prefetchHubArchiveIntentDebounced(archiveId: string): void {
    const now = Date.now();
    const last = lastPrefetchAt.get(archiveId) ?? 0;
    if (now - last < HUB_ARCHIVE_PREFETCH_COOLDOWN_MS) return;
    lastPrefetchAt.set(archiveId, now);
    runPrefetch(archiveId, 'hover');
}

/** prefetch فوري عند النقر — يتجاوز cooldown ويحمّل مسار الفتح */
export function prefetchHubArchiveIntentImmediate(archiveId: string, userId?: string | null): void {
    lastPrefetchAt.set(archiveId, Date.now());
    runPrefetch(archiveId, 'open', userId);
}

/** idle warm لبطاقة المعاملات — cold open أخف بعد جاهزية الرئيسية */
export function scheduleTransactionHubTileIdlePrefetch(): void {
    if (typeof window === 'undefined' || transactionIdleScheduled) return;
    transactionIdleScheduled = true;

    const run = () => prefetchHubArchiveIntentDebounced('transaction');

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 5_000 });
    } else {
        window.setTimeout(run, 2_000);
    }
}
