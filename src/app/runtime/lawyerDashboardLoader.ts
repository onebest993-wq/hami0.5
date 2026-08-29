/**
 * تحميل موحّد للوحة المحامي — prefetch + lazy في الإنتاج والتطوير.
 * الوعد يُخزَّن مرة واحدة؛ يُصفَّر عند HMR dispose أو resetLawyerDashboardModuleCache.
 */
type LawyerDashboardModule = typeof import('@/app/components/lawyer/LawyerDashboard');

let dashboardModulePromise: Promise<LawyerDashboardModule> | null = null;
let cachedDashboardModule: LawyerDashboardModule | null = null;

export function resetLawyerDashboardModuleCache(): void {
    dashboardModulePromise = null;
    cachedDashboardModule = null;
}

export function getLawyerDashboardModuleSync(): LawyerDashboardModule | null {
    return cachedDashboardModule;
}

function createDashboardModuleImport(): Promise<LawyerDashboardModule> {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') {
        return Promise.reject(new Error('lawyer dashboard is excluded from the headquarters product'));
    }
    return import('@/app/components/lawyer/LawyerDashboard')
        .then((mod) => {
            cachedDashboardModule = mod;
            return mod;
        })
        .catch((err) => {
            dashboardModulePromise = null;
            cachedDashboardModule = null;
            throw err;
        });
}

export function loadLawyerDashboardModule(): Promise<LawyerDashboardModule> {
    if (cachedDashboardModule) return Promise.resolve(cachedDashboardModule);
    if (!dashboardModulePromise) {
        dashboardModulePromise = createDashboardModuleImport();
    }
    return dashboardModulePromise;
}

export function prefetchLawyerDashboardEntry(): void {
    if (import.meta.env.DEV || typeof window === 'undefined') return;
    if (!dashboardModulePromise) {
        dashboardModulePromise = createDashboardModuleImport();
    }
    void dashboardModulePromise.catch(() => {
        dashboardModulePromise = null;
    });
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        dashboardModulePromise = null;
    });
}
