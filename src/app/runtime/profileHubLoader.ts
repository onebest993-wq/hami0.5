import type { ComponentProps, ComponentType } from 'react';
import {
    getCachedLawyerDashboardProfileTab,
    isProfileTabModuleResolved,
    loadProfileTabModule,
    prefetchProfileTabModule,
    type LawyerDashboardProfileTabComponent,
    type LawyerDashboardProfileTabProps,
} from '@/app/runtime/profileTabModuleLoader';
import {
    isRoyalLawyerProfileModuleResolved,
    loadRoyalLawyerProfileModule,
    prefetchRoyalLawyerProfileChunk,
} from '@/app/runtime/royalLawyerProfileLoader';

type RoyalLawyerProfileModule = typeof import('@/app/components/lawyer/RoyalLawyerProfile/index');
type RoyalLawyerProfileProps = ComponentProps<RoyalLawyerProfileModule['RoyalLawyerProfile']>;
export type RoyalLawyerProfileComponent = ComponentType<RoyalLawyerProfileProps>;

export type { LawyerDashboardProfileTabComponent, LawyerDashboardProfileTabProps };

export {
    getCachedLawyerDashboardProfileTab,
    isProfileTabModuleResolved,
    prefetchProfileTabModule,
} from '@/app/runtime/profileTabModuleLoader';

let cachedRoyalLawyerProfile: RoyalLawyerProfileComponent | null = null;

export function isProfileShellModuleResolved(): boolean {
    return isProfileTabModuleResolved() && isRoyalLawyerProfileModuleResolved();
}

export function isRoyalLawyerProfileModuleResolvedFromHub(): boolean {
    return isRoyalLawyerProfileModuleResolved();
}

export function getCachedRoyalLawyerProfile(): RoyalLawyerProfileComponent | null {
    return cachedRoyalLawyerProfile;
}

/** للاختبارات */
export function resetProfileHubModuleCacheForTests(): void {
    cachedRoyalLawyerProfile = null;
    void import('@/app/runtime/profileTabModuleLoader').then((m) =>
        m.resetProfileTabModuleCacheForTests(),
    );
    void import('@/app/runtime/royalLawyerProfileModuleState').then((m) =>
        m.resetRoyalLawyerProfileModuleStateForTests(),
    );
}

export function loadProfileHubModule(): Promise<
    [typeof import('@/app/components/lawyer/dashboard/LawyerDashboardProfileTab'), RoyalLawyerProfileModule]
> {
    return Promise.all([
        loadProfileTabModule(),
        loadRoyalLawyerProfileModule().then((mod) => {
            if (mod?.RoyalLawyerProfile) cachedRoyalLawyerProfile = mod.RoyalLawyerProfile;
            return mod;
        }),
    ]);
}

export function prefetchProfileHubModule(): void {
    prefetchProfileTabModule();
    prefetchRoyalLawyerProfileChunk();
}

/** يضمن جاهزية shell الملف (التبويب + الواجهة) للفتح الفوري */
export function hydrateProfileShellForInstantOpen(): Promise<boolean> {
    return loadProfileHubModule()
        .then(() => isProfileShellModuleResolved())
        .catch(() => false);
}
