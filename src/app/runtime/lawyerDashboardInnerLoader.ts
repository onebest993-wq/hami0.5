/**
 * كاش Inner — يتجاوز Suspense إن وصل المقطع قبل أول رسم.
 */
type InnerModule = typeof import('@/app/components/lawyer/dashboard/LawyerDashboardInner');

let innerPromise: Promise<InnerModule> | null = null;
let cachedInner: InnerModule | null = null;

export function getLawyerDashboardInnerSync(): InnerModule | null {
    return cachedInner;
}

function ensureInnerPromise(): Promise<InnerModule> {
    if (!innerPromise) {
        innerPromise = import('@/app/components/lawyer/dashboard/LawyerDashboardInner').then((mod) => {
            cachedInner = mod;
            return mod;
        });
    }
    return innerPromise;
}

export function prefetchLawyerDashboardInner(): void {
    if (typeof window === 'undefined') return;
    void ensureInnerPromise().catch(() => undefined);
}

export function loadLawyerDashboardInner(): Promise<InnerModule> {
    return ensureInnerPromise();
}
