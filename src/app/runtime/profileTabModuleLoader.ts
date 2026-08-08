import type { ComponentProps, ComponentType } from 'react';
import { ensureRejectClearingPromise } from '@/app/runtime/ensureRejectClearingPromise';

type LawyerDashboardProfileTabModule =
    typeof import('@/app/components/lawyer/dashboard/LawyerDashboardProfileTab');

export type LawyerDashboardProfileTabProps = ComponentProps<
    LawyerDashboardProfileTabModule['LawyerDashboardProfileTab']
>;
export type LawyerDashboardProfileTabComponent = ComponentType<LawyerDashboardProfileTabProps>;

let modulePromise: Promise<LawyerDashboardProfileTabModule> | null = null;
let cachedTab: LawyerDashboardProfileTabComponent | null = null;

export function isProfileTabModuleResolved(): boolean {
    return cachedTab !== null;
}

export function getCachedLawyerDashboardProfileTab(): LawyerDashboardProfileTabComponent | null {
    return cachedTab;
}

/** للاختبارات */
export function resetProfileTabModuleCacheForTests(): void {
    modulePromise = null;
    cachedTab = null;
}

function ensureModule(): Promise<LawyerDashboardProfileTabModule> {
    return ensureRejectClearingPromise(modulePromise, (next) => {
        modulePromise = next;
    }, () =>
        import('@/app/components/lawyer/dashboard/LawyerDashboardProfileTab').then((mod) => {
            if (mod?.LawyerDashboardProfileTab) {
                cachedTab = mod.LawyerDashboardProfileTab;
            }
            return mod;
        }),
    );
}

export function loadProfileTabModule(): Promise<LawyerDashboardProfileTabModule> {
    return ensureModule();
}

export function prefetchProfileTabModule(): void {
    if (typeof window === 'undefined') return;
    void ensureModule().catch(() => undefined);
}
