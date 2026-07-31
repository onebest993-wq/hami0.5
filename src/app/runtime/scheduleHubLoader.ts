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

let scheduleTabPromise: Promise<LawyerDashboardScheduleTabModule> | null = null;
let smartLegalRadarPromise: Promise<SmartLegalRadarModule> | null = null;
let hubModulePromise: Promise<ScheduleHubModule> | null = null;
let scheduleTabHostPromise: Promise<unknown> | null = null;
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
    scheduleTabPromise = null;
    smartLegalRadarPromise = null;
    hubModulePromise = null;
    scheduleTabHostPromise = null;
    cachedLawyerDashboardScheduleTab = null;
    cachedSmartLegalRadar = null;
}

function ensureScheduleTabModule(): Promise<LawyerDashboardScheduleTabModule> {
    if (!scheduleTabPromise) {
        scheduleTabPromise = import('@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab').then(
            (mod) => {
                if (mod?.LawyerDashboardScheduleTab) {
                    cachedLawyerDashboardScheduleTab = mod.LawyerDashboardScheduleTab;
                }
                return mod;
            },
        );
    }
    return scheduleTabPromise;
}

function ensureSmartLegalRadarModule(): Promise<SmartLegalRadarModule> {
    if (!smartLegalRadarPromise) {
        smartLegalRadarPromise = import('@/app/components/lawyer/SmartLegalRadar.tsx').then((mod) => {
            if (mod?.SmartLegalRadar) {
                cachedSmartLegalRadar = mod.SmartLegalRadar;
            }
            return mod;
        });
    }
    return smartLegalRadarPromise;
}

function ensureHubModulePromise(): Promise<ScheduleHubModule> {
    if (!hubModulePromise) {
        hubModulePromise = Promise.all([ensureScheduleTabModule(), ensureSmartLegalRadarModule()]);
    }
    return hubModulePromise;
}

/** chunk المضيف في MainView — أول عنق زجاجة عند النقر قبل أي محتوى */
export function prefetchScheduleTabHostModule(): void {
    if (typeof window === 'undefined') return;
    if (!scheduleTabHostPromise) {
        scheduleTabHostPromise = import(
            '@/app/components/lawyer/dashboard/schedule/ScheduleTabHost'
        ).catch(() => undefined);
    }
}

export function loadScheduleTabModule(): Promise<LawyerDashboardScheduleTabModule> {
    return ensureScheduleTabModule();
}

export function loadSmartLegalRadarModule(): Promise<SmartLegalRadarModule> {
    return ensureSmartLegalRadarModule();
}

export function loadScheduleHubModule(): Promise<ScheduleHubModule> {
    return ensureHubModulePromise();
}

export function prefetchScheduleHubModule(): void {
    if (typeof window === 'undefined') return;
    prefetchScheduleTabHostModule();
    void ensureScheduleTabModule().catch(() => undefined);
    void ensureSmartLegalRadarModule().catch(() => undefined);
}

/**
 * يضمن جاهزية تبويب التقويم للفتح الفوري — دون انتظار الرادار (يُسخَّن في الخلفية).
 * يُستخدم للتسخين المسبق؛ المسار الحرج أصبح sync في ScheduleTabHost.
 */
export function hydrateScheduleShellForInstantOpen(): Promise<boolean> {
    void ensureSmartLegalRadarModule().catch(() => undefined);
    return ensureScheduleTabModule()
        .then(() => isScheduleTabModuleResolved())
        .catch(() => false);
}
