/**
 * تسخين سطح إنشاء التنفيذ (بوابة + نموذج) — يُستدعى من hover/فتح الأرشيف/زر الجديد.
 * يخزّن المكوّن بعد التحميل لرسم مباشر بلا «جاري تجهيز النموذج».
 */
type ExecutionCreationViewModule = typeof import('@/app/components/lawyer/ExecutionCreationView.tsx');
type ExecutionCreationPortalModule =
    typeof import('@/app/components/lawyer/dashboard/ExecutionCreationPortal');

export type ExecutionCreationViewComponent = ExecutionCreationViewModule['ExecutionCreationView'];

let viewPromise: Promise<ExecutionCreationViewModule> | null = null;
let portalPromise: Promise<ExecutionCreationPortalModule> | null = null;
let cachedView: ExecutionCreationViewComponent | null = null;
let surfaceReady = false;

export function resetExecutionCreationViewLoaderForTests(): void {
    viewPromise = null;
    portalPromise = null;
    cachedView = null;
    surfaceReady = false;
}

function ensureViewModule(): Promise<ExecutionCreationViewModule> {
    if (!viewPromise) {
        viewPromise = import('@/app/components/lawyer/ExecutionCreationView.tsx')
            .then((mod) => {
                cachedView = mod.ExecutionCreationView;
                return mod;
            })
            .catch((error) => {
                viewPromise = null;
                throw error;
            });
    }
    return viewPromise;
}

function ensurePortalModule(): Promise<ExecutionCreationPortalModule> {
    if (!portalPromise) {
        portalPromise = import('@/app/components/lawyer/dashboard/ExecutionCreationPortal').catch(
            (error) => {
                portalPromise = null;
                throw error;
            },
        );
    }
    return portalPromise;
}

export function loadExecutionCreationViewModule(): Promise<ExecutionCreationViewModule> {
    return ensureViewModule();
}

export function loadExecutionCreationPortalModule(): Promise<ExecutionCreationPortalModule> {
    return ensurePortalModule();
}

export function getCachedExecutionCreationView(): ExecutionCreationViewComponent | null {
    return cachedView;
}

export function isExecutionCreationSurfaceReady(): boolean {
    return surfaceReady && cachedView !== null;
}

export function prefetchExecutionCreationViewModule(): void {
    if (typeof window === 'undefined') return;
    void ensureViewModule().catch(() => undefined);
}

export function prefetchExecutionCreationPortalModule(): void {
    if (typeof window === 'undefined') return;
    void ensurePortalModule().catch(() => undefined);
}

/** بوابة + نموذج بالتوازي — يمنع waterfall عند أول فتح لـ «إضبارة جديدة» */
export function prefetchExecutionCreationSurface(): void {
    if (typeof window === 'undefined') return;
    void ensurePortalModule().catch(() => undefined);
    void ensureViewModule()
        .then(() => {
            surfaceReady = true;
        })
        .catch(() => undefined);
}

/** ينتظر جاهزية النموذج بالكامل — النقرة تستخدم openExecutionCreationWithContract (commit-first) */
export async function ensureExecutionCreationSurfaceReady(): Promise<void> {
    if (typeof window === 'undefined') return;
    await Promise.all([ensurePortalModule(), ensureViewModule()]);
    surfaceReady = true;
}
