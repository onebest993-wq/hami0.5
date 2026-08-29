/**
 * تحميل موحّد لـ LawyerDashboardGate — prefetch حرج + bypass لـ Suspense عند الجاهزية.
 */

type LawyerDashboardGateModule = typeof import('@/app/bootstrap/LawyerDashboardGate');

let gateModulePromise: Promise<LawyerDashboardGateModule> | null = null;
let cachedGateModule: LawyerDashboardGateModule | null = null;

export function resetLawyerDashboardGateModuleCacheForTests(): void {
    gateModulePromise = null;
    cachedGateModule = null;
}

export function getLawyerDashboardGateModuleSync(): LawyerDashboardGateModule | null {
    return cachedGateModule;
}

function createGateModuleImport(): Promise<LawyerDashboardGateModule> {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') {
        return Promise.reject(new Error('lawyer dashboard gate is excluded from the headquarters product'));
    }
    return import('@/app/bootstrap/LawyerDashboardGate').then((mod) => {
        cachedGateModule = mod;
        return mod;
    });
}

export function loadLawyerDashboardGateModule(): Promise<LawyerDashboardGateModule> {
    if (cachedGateModule) return Promise.resolve(cachedGateModule);
    if (!gateModulePromise) {
        gateModulePromise = createGateModuleImport().catch((err) => {
            gateModulePromise = null;
            cachedGateModule = null;
            throw err;
        });
    }
    return gateModulePromise;
}

export function prefetchLawyerDashboardGateModule(): void {
    if (typeof window === 'undefined') return;
    void loadLawyerDashboardGateModule().catch(() => undefined);
}
