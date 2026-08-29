/**
 * تسخين فتح مخزن التنفيذ — prefetch فقط، لا يُحجب التركيب في MainView.
 * (حجب MainView بـ Promise.all + soft-settle 6s كان سبب الهيكل المعلّق ~7ث والوميض بعده)
 */
import { loadExecutionArchiveHubModule, prefetchExecutionArchiveContent } from '@/app/runtime/hubArchiveLoader';

let openEpoch = 0;
let openPromise: Promise<boolean> | null = null;

function loadOverlayEntryModule(): Promise<unknown> {
    return import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry'
    ).catch(() => undefined);
}

/** Entry + Portal فقط — Surface/Grid عبر prefetch داخل loadExecutionArchiveHubModule */
export function ensureExecutionArchiveOpenReady(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (!openPromise) {
        const epoch = openEpoch;
        openPromise = Promise.all([loadOverlayEntryModule(), loadExecutionArchiveHubModule()])
            .then(() => epoch === openEpoch)
            .catch(() => false)
            .then((ok) => {
                if (!ok) openPromise = null;
                return ok;
            });
    }
    return openPromise;
}

export function prefetchExecutionArchiveOpen(): void {
    void import('@/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome').catch(
        () => undefined,
    );
    prefetchExecutionArchiveContent();
    void ensureExecutionArchiveOpenReady();
}

export function resetExecutionArchiveOpenSession(): void {
    openEpoch += 1;
    openPromise = null;
}

export function resetExecutionArchiveOpenSessionForTests(): void {
    openEpoch = 0;
    openPromise = null;
}
