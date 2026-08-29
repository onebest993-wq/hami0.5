type UrgentOrdersViewModule = typeof import('@/app/components/lawyer/View_Urgent_And_Orders_Dashboard');

let modulePromise: Promise<UrgentOrdersViewModule> | null = null;

export function resetUrgentOrdersViewLoader(): void {
    modulePromise = null;
}

function ensureModule(): Promise<UrgentOrdersViewModule> {
    if (!modulePromise) {
        modulePromise = import('@/app/components/lawyer/View_Urgent_And_Orders_Dashboard').catch((error) => {
            modulePromise = null;
            throw error;
        });
    }
    return modulePromise;
}

export function loadUrgentOrdersViewModule(): Promise<UrgentOrdersViewModule> {
    return ensureModule();
}

export function prefetchUrgentOrdersViewModule(): void {
    if (typeof window === 'undefined') return;
    void ensureModule().catch(() => undefined);
}
