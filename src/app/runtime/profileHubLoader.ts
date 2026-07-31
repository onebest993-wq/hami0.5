import type { ComponentProps, ComponentType } from 'react';
import { ensureRejectClearingPromise } from '@/app/runtime/ensureRejectClearingPromise';

type LawyerDashboardProfileTabModule =
    typeof import('@/app/components/lawyer/dashboard/LawyerDashboardProfileTab');
type RoyalLawyerProfileModule = typeof import('@/app/components/lawyer/RoyalLawyerProfile');

type LawyerDashboardProfileTabProps = ComponentProps<
    LawyerDashboardProfileTabModule['LawyerDashboardProfileTab']
>;
type RoyalLawyerProfileProps = ComponentProps<RoyalLawyerProfileModule['RoyalLawyerProfile']>;

export type LawyerDashboardProfileTabComponent = ComponentType<LawyerDashboardProfileTabProps>;
export type RoyalLawyerProfileComponent = ComponentType<RoyalLawyerProfileProps>;

type ProfileHubModule = [LawyerDashboardProfileTabModule, RoyalLawyerProfileModule];

let hubModulePromise: Promise<ProfileHubModule> | null = null;
let cachedLawyerDashboardProfileTab: LawyerDashboardProfileTabComponent | null = null;
let cachedRoyalLawyerProfile: RoyalLawyerProfileComponent | null = null;

export function isProfileShellModuleResolved(): boolean {
    return cachedLawyerDashboardProfileTab !== null && cachedRoyalLawyerProfile !== null;
}

export function isProfileTabModuleResolved(): boolean {
    return cachedLawyerDashboardProfileTab !== null;
}

export function isRoyalLawyerProfileModuleResolved(): boolean {
    return cachedRoyalLawyerProfile !== null;
}

export function getCachedLawyerDashboardProfileTab(): LawyerDashboardProfileTabComponent | null {
    return cachedLawyerDashboardProfileTab;
}

export function getCachedRoyalLawyerProfile(): RoyalLawyerProfileComponent | null {
    return cachedRoyalLawyerProfile;
}

/** للاختبارات */
export function resetProfileHubModuleCacheForTests(): void {
    hubModulePromise = null;
    cachedLawyerDashboardProfileTab = null;
    cachedRoyalLawyerProfile = null;
}

function ensureHubModulePromise(): Promise<ProfileHubModule> {
    return ensureRejectClearingPromise(hubModulePromise, (next) => {
        hubModulePromise = next;
    }, () =>
        Promise.all([
            import('@/app/components/lawyer/dashboard/LawyerDashboardProfileTab').then((mod) => {
                if (mod?.LawyerDashboardProfileTab) {
                    cachedLawyerDashboardProfileTab = mod.LawyerDashboardProfileTab;
                }
                return mod;
            }),
            import('@/app/components/lawyer/RoyalLawyerProfile').then((mod) => {
                if (mod?.RoyalLawyerProfile) {
                    cachedRoyalLawyerProfile = mod.RoyalLawyerProfile;
                }
                return mod;
            }),
        ]),
    );
}

export function loadProfileHubModule(): Promise<ProfileHubModule> {
    return ensureHubModulePromise();
}

export function prefetchProfileHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureHubModulePromise().catch(() => undefined);
}

/** يضمن جاهزية shell الملف (التبويب + الواجهة) للفتح الفوري */
export function hydrateProfileShellForInstantOpen(): Promise<boolean> {
    return ensureHubModulePromise()
        .then(() => isProfileShellModuleResolved())
        .catch(() => false);
}
