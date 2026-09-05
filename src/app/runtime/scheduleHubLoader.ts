import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

type ScheduleTabHostModule = typeof import('@/app/components/lawyer/dashboard/schedule/ScheduleTabHost');

let scheduleTabHostPromise: Promise<ScheduleTabHostModule> | null = null;
let hostResolved = false;

export function isScheduleShellModuleResolved(): boolean {
    return hostResolved;
}

function ensureScheduleTabHostModule(): Promise<ScheduleTabHostModule> {
    if (!scheduleTabHostPromise) {
        scheduleTabHostPromise = import(
            '@/app/components/lawyer/dashboard/schedule/ScheduleTabHost'
        ).then((mod) => {
            hostResolved = Boolean(mod?.ScheduleTabHost);
            return mod;
        });
    }
    return scheduleTabHostPromise;
}

export const LazyScheduleTabHost = createPreloadableLazyComponent(() =>
    ensureScheduleTabHostModule().then((m) => ({
        default: m.ScheduleTabHost as unknown as LazyComponent,
    })),
);

/** للاختبارات */
export function resetScheduleHubModuleCacheForTests(): void {
    scheduleTabHostPromise = null;
    hostResolved = false;
    LazyScheduleTabHost.resetForTests();
}

/** chunk المضيف في MainView — أول عنق زجاجة عند النقر قبل أي محتوى */
export function prefetchScheduleTabHostModule(): void {
    if (typeof window === 'undefined') return;
    void LazyScheduleTabHost.preload();
}

/** يضمن جاهزية Host قبل التركيب الكسول — يمنع تعليق Suspense عند النقر المبكر */
export function loadScheduleTabHostModule(): Promise<ScheduleTabHostModule> {
    void LazyScheduleTabHost.preload();
    return ensureScheduleTabHostModule();
}

/** Host يستورد التبويب والرادار ثابتاً — مسار واحد بلا تسخين ثلاثي */
export function loadScheduleHubModule(): Promise<ScheduleTabHostModule> {
    return ensureScheduleTabHostModule();
}

export function prefetchScheduleHubModule(): void {
    prefetchScheduleTabHostModule();
}

/** يضمن جاهزية مضيف التقويم للفتح الفوري */
export function hydrateScheduleShellForInstantOpen(): Promise<boolean> {
    return LazyScheduleTabHost.preload().then(() => isScheduleShellModuleResolved());
}
