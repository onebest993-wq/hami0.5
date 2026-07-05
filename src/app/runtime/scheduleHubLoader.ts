import type { ComponentProps, ComponentType } from 'react';

type LawyerDashboardScheduleTabModule =
    typeof import('@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab');
type SmartLegalRadarModule = typeof import('@/app/components/lawyer/SmartLegalRadar.tsx');

type LawyerDashboardScheduleTabProps = ComponentProps<
    LawyerDashboardScheduleTabModule['LawyerDashboardScheduleTab']
>;
type SmartLegalRadarProps = ComponentProps<SmartLegalRadarModule['SmartLegalRadar']>;

export type LawyerDashboardScheduleTabComponent = ComponentType<LawyerDashboardScheduleTabProps>;
export type SmartLegalRadarComponent = ComponentType<SmartLegalRadarProps>;

type ScheduleHubModule = [LawyerDashboardScheduleTabModule, SmartLegalRadarModule];

let hubModulePromise: Promise<ScheduleHubModule> | null = null;
let cachedLawyerDashboardScheduleTab: LawyerDashboardScheduleTabComponent | null = null;
let cachedSmartLegalRadar: SmartLegalRadarComponent | null = null;

export function isScheduleShellModuleResolved(): boolean {
    return cachedLawyerDashboardScheduleTab !== null && cachedSmartLegalRadar !== null;
}

export function isScheduleTabModuleResolved(): boolean {
    return cachedLawyerDashboardScheduleTab !== null;
}

export function isSmartLegalRadarModuleResolved(): boolean {
    return cachedSmartLegalRadar !== null;
}

export function getCachedLawyerDashboardScheduleTab(): LawyerDashboardScheduleTabComponent | null {
    return cachedLawyerDashboardScheduleTab;
}

export function getCachedSmartLegalRadar(): SmartLegalRadarComponent | null {
    return cachedSmartLegalRadar;
}

/** للاختبارات */
export function resetScheduleHubModuleCacheForTests(): void {
    hubModulePromise = null;
    cachedLawyerDashboardScheduleTab = null;
    cachedSmartLegalRadar = null;
}

function ensureHubModulePromise(): Promise<ScheduleHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = Promise.all([
            import('@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab').then((mod) => {
                if (mod?.LawyerDashboardScheduleTab) {
                    cachedLawyerDashboardScheduleTab = mod.LawyerDashboardScheduleTab;
                }
                return mod;
            }),
            import('@/app/components/lawyer/SmartLegalRadar.tsx').then((mod) => {
                if (mod?.SmartLegalRadar) {
                    cachedSmartLegalRadar = mod.SmartLegalRadar;
                }
                return mod;
            }),
        ]);
    }
    return hubModulePromise;
}

export function loadScheduleHubModule(): Promise<ScheduleHubModule> {
    return ensureHubModulePromise();
}

export function prefetchScheduleHubModule(): void {
    if (typeof window === 'undefined') return;
    void ensureHubModulePromise().catch(() => undefined);
}

/** يضمن جاهزية shell التقويم (التبويب + الرادار) للفتح الفوري */
export function hydrateScheduleShellForInstantOpen(): Promise<boolean> {
    return ensureHubModulePromise()
        .then(() => isScheduleShellModuleResolved())
        .catch(() => false);
}
