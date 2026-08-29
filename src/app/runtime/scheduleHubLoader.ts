type ScheduleTabHostModule = typeof import('@/app/components/lawyer/dashboard/schedule/ScheduleTabHost');

let scheduleTabHostPromise: Promise<ScheduleTabHostModule> | null = null;
let hostResolved = false;

export function isScheduleShellModuleResolved(): boolean {
    return hostResolved;
}

/** للاختبارات */
export function resetScheduleHubModuleCacheForTests(): void {
    scheduleTabHostPromise = null;
    hostResolved = false;
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

/** chunk المضيف في MainView — أول عنق زجاجة عند النقر قبل أي محتوى */
export function prefetchScheduleTabHostModule(): void {
    if (typeof window === 'undefined') return;
    void ensureScheduleTabHostModule().catch(() => undefined);
}

/** يضمن جاهزية Host قبل التركيب الكسول — يمنع تعليق Suspense عند النقر المبكر */
export function loadScheduleTabHostModule(): Promise<ScheduleTabHostModule> {
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
    return ensureScheduleTabHostModule()
        .then(() => isScheduleShellModuleResolved())
        .catch(() => false);
}
