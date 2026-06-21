/**
 * تحميل مرحلي للإضبارة الجزائية — store ثم اللوحة.
 */
type CriminalDashboardModule = typeof import('@/app/components/lawyer/criminal-system/CriminalDashboard');

let criminalModulePromise: Promise<CriminalDashboardModule> | null = null;
let criminalStorePrefetch: Promise<unknown> | null = null;

export function resetCriminalDashboardModuleCache(): void {
    criminalModulePromise = null;
    criminalStorePrefetch = null;
}

function prefetchCriminalStore(): Promise<unknown> {
    if (!criminalStorePrefetch) {
        criminalStorePrefetch = import('@/app/components/lawyer/criminal-system/criminalStore').catch((err) => {
            criminalStorePrefetch = null;
            throw err;
        });
    }
    return criminalStorePrefetch;
}

function createCriminalModuleImport(): Promise<CriminalDashboardModule> {
    return prefetchCriminalStore()
        .then(() => import('@/app/components/lawyer/criminal-system/CriminalDashboard'))
        .catch((err) => {
            criminalModulePromise = null;
            throw err;
        });
}

export function loadCriminalDashboardModule(): Promise<CriminalDashboardModule> {
    if (!criminalModulePromise) {
        criminalModulePromise = createCriminalModuleImport();
    }
    return criminalModulePromise;
}

export function prefetchCriminalDashboardPhased(): void {
    if (typeof window === 'undefined') return;

    void prefetchCriminalStore().catch(() => undefined);

    const scheduleDashboard = () => {
        if (!criminalModulePromise) {
            criminalModulePromise = createCriminalModuleImport();
        }
        void criminalModulePromise.catch(() => {
            criminalModulePromise = null;
        });
    };

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(scheduleDashboard, { timeout: 5000 });
    } else {
        window.setTimeout(scheduleDashboard, 1500);
    }
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        criminalModulePromise = null;
        criminalStorePrefetch = null;
    });
}
