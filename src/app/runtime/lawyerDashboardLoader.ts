/**
 * تحميل موحّد للوحة المحامي — prefetch + lazy في الإنتاج فقط.
 * في التطوير: App يستورد LawyerDashboard بشكل ثابت (static) لتجنّب فشل dynamic import مع HMR.
 */
type LawyerDashboardModule = typeof import('@/app/components/lawyer/LawyerDashboard');

let dashboardModulePromise: Promise<LawyerDashboardModule> | null = null;

export function resetLawyerDashboardModuleCache(): void {
    dashboardModulePromise = null;
}

function createDashboardModuleImport(): Promise<LawyerDashboardModule> {
    return import('@/app/components/lawyer/LawyerDashboard').catch((err) => {
        dashboardModulePromise = null;
        throw err;
    });
}

export function loadLawyerDashboardModule(): Promise<LawyerDashboardModule> {
    if (import.meta.env.DEV) {
        return createDashboardModuleImport();
    }
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
