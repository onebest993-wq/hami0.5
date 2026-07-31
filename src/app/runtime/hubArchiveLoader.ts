type ArchivePortalModule = typeof import('@/app/components/lawyer/ArchivePortal.tsx');
type LawsuitsWorkspaceModule = typeof import('@/app/components/lawyer/LawsuitsWorkspace');

export type ArchivePortalComponent = ArchivePortalModule['ArchivePortal'];
export type LawsuitsWorkspaceComponent = LawsuitsWorkspaceModule['LawsuitsWorkspace'];

const LOAD_TIMEOUT_MS = 18_000;

let archivePortalPromise: Promise<ArchivePortalModule> | null = null;
let lawsuitsWorkspacePromise: Promise<LawsuitsWorkspaceModule> | null = null;
let cachedArchivePortal: ArchivePortalComponent | null = null;
let cachedLawsuitsWorkspace: LawsuitsWorkspaceComponent | null = null;
let lawsuitFileGridPromise: Promise<void> | null = null;
let lawsuitFileGridReady = false;
let executionSurfacePromise: Promise<void> | null = null;
let executionSurfaceReady = false;
let executionFileGridPromise: Promise<void> | null = null;
let executionFileGridReady = false;
let cachedExecutionSurface:
    | (typeof import('@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface'))['ArchivePortalExecutionSurface']
    | null = null;
let cachedExecutionFileGrid:
    | (typeof import('@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid'))['ExecutionArchiveFileGrid']
    | null = null;

const archivePortalListeners = new Set<() => void>();
const lawsuitFileGridListeners = new Set<() => void>();
const executionSurfaceListeners = new Set<() => void>();
const executionFileGridListeners = new Set<() => void>();

function notifyArchivePortalListeners(): void {
    archivePortalListeners.forEach((listener) => listener());
}

function notifyLawsuitFileGridListeners(): void {
    lawsuitFileGridListeners.forEach((listener) => listener());
}

function notifyExecutionSurfaceListeners(): void {
    executionSurfaceListeners.forEach((listener) => listener());
}

function notifyExecutionFileGridListeners(): void {
    executionFileGridListeners.forEach((listener) => listener());
}

export function subscribeArchivePortalCache(listener: () => void): () => void {
    archivePortalListeners.add(listener);
    return () => {
        archivePortalListeners.delete(listener);
    };
}

export function subscribeLawsuitFileGridReady(listener: () => void): () => void {
    lawsuitFileGridListeners.add(listener);
    return () => {
        lawsuitFileGridListeners.delete(listener);
    };
}

export function subscribeExecutionSurfaceReady(listener: () => void): () => void {
    executionSurfaceListeners.add(listener);
    return () => {
        executionSurfaceListeners.delete(listener);
    };
}

export function subscribeExecutionFileGridReady(listener: () => void): () => void {
    executionFileGridListeners.add(listener);
    return () => {
        executionFileGridListeners.delete(listener);
    };
}

export function getCachedArchivePortal(): ArchivePortalComponent | null {
    return cachedArchivePortal;
}

/** شبكة بطاقات الدعاوى جاهزة للتبنّي بلا Suspense بعد الكروم */
export function getLawsuitFileGridReady(): boolean {
    return lawsuitFileGridReady;
}

/** سطح مخزن التنفيذ جاهز — يمنع Suspense الداخلي بعد اعتماد Portal */
export function getExecutionSurfaceReady(): boolean {
    return executionSurfaceReady;
}

/** شبكة بطاقات التنفيذ جاهزة — يمنع «جاري تحميل بطاقات التنفيذ» بعد الاعتماد */
export function getExecutionFileGridReady(): boolean {
    return executionFileGridReady;
}

export function getCachedExecutionSurface(): NonNullable<typeof cachedExecutionSurface> | null {
    return cachedExecutionSurface;
}

export function getCachedExecutionFileGrid(): NonNullable<typeof cachedExecutionFileGrid> | null {
    return cachedExecutionFileGrid;
}

/**
 * تقييم ArchivePortalFileGrid أثناء InstantShell — لا يُؤجّل notify للـ Portal.
 * Host الدعاوى ينتظر هذه الجاهزية قبل تركيب children.
 */
function ensureLawsuitFileGridPromise(): Promise<void> {
    if (!lawsuitFileGridPromise) {
        lawsuitFileGridPromise = import(
            '@/app/components/lawyer/ArchivePortal/components/ArchivePortalFileGrid'
        )
            .then(() => undefined)
            .catch(() => undefined)
            .then(() => {
                lawsuitFileGridReady = true;
                notifyLawsuitFileGridListeners();
            });
    }
    return lawsuitFileGridPromise;
}

export function adoptCachedArchivePortal(component: ArchivePortalComponent): void {
    if (cachedArchivePortal === component) return;
    cachedArchivePortal = component;
    notifyArchivePortalListeners();
}

export function getCachedLawsuitsWorkspace(): LawsuitsWorkspaceComponent | null {
    return cachedLawsuitsWorkspace;
}

function resetLawsuitFileGridCache(): void {
    lawsuitFileGridPromise = null;
    lawsuitFileGridReady = false;
    notifyLawsuitFileGridListeners();
}

function resetExecutionSurfaceCache(): void {
    executionSurfacePromise = null;
    executionSurfaceReady = false;
    cachedExecutionSurface = null;
    notifyExecutionSurfaceListeners();
}

function resetExecutionFileGridCache(): void {
    executionFileGridPromise = null;
    executionFileGridReady = false;
    cachedExecutionFileGrid = null;
    notifyExecutionFileGridListeners();
}

export function resetArchivePortalModuleCacheForTests(): void {
    archivePortalPromise = null;
    cachedArchivePortal = null;
    resetLawsuitFileGridCache();
    resetExecutionSurfaceCache();
    resetExecutionFileGridCache();
    notifyArchivePortalListeners();
}

export function resetHubArchiveModuleCacheForTests(): void {
    archivePortalPromise = null;
    lawsuitsWorkspacePromise = null;
    cachedArchivePortal = null;
    cachedLawsuitsWorkspace = null;
    resetLawsuitFileGridCache();
    resetExecutionSurfaceCache();
    resetExecutionFileGridCache();
    notifyArchivePortalListeners();
}

export function invalidateArchivePortalModuleCache(): void {
    archivePortalPromise = null;
    cachedArchivePortal = null;
    resetLawsuitFileGridCache();
    resetExecutionSurfaceCache();
    resetExecutionFileGridCache();
    notifyArchivePortalListeners();
    void import('@/app/runtime/executionArchiveOpenSession')
        .then((m) => m.resetExecutionArchiveOpenSession())
        .catch(() => undefined);
}

function withLoadTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error(`انتهت مهلة تحميل ${label}. تحقق من الاتصال ثم أعد المحاولة.`));
        }, LOAD_TIMEOUT_MS);

        promise
            .then((value) => {
                window.clearTimeout(timeoutId);
                resolve(value);
            })
            .catch((error) => {
                window.clearTimeout(timeoutId);
                reject(error);
            });
    });
}

function ensureArchivePortalPromise(): Promise<ArchivePortalModule> {
    if (!archivePortalPromise) {
        archivePortalPromise = withLoadTimeout(
            import('@/app/components/lawyer/ArchivePortal.tsx'),
            'أرشيف الإضابير',
        )
            .then((mod) => {
                cachedArchivePortal = mod.ArchivePortal;
                notifyArchivePortalListeners();
                // FileGrid يُقيَّم فقط عبر prefetchLawsuitArchiveContent (فتح/hover دعاوى)
                return mod;
            })
            .catch((error) => {
                archivePortalPromise = null;
                throw error;
            });
    }
    return archivePortalPromise;
}

function ensureLawsuitsWorkspacePromise(): Promise<LawsuitsWorkspaceModule> {
    if (!lawsuitsWorkspacePromise) {
        lawsuitsWorkspacePromise = withLoadTimeout(
            import('@/app/components/lawyer/LawsuitsWorkspace'),
            'مساحة الدعاوى',
        )
            .then((mod) => {
                cachedLawsuitsWorkspace = mod.LawsuitsWorkspace;
                return mod;
            })
            .catch((error) => {
                lawsuitsWorkspacePromise = null;
                throw error;
            });
    }
    return lawsuitsWorkspacePromise;
}

export function loadArchivePortalModule(): Promise<ArchivePortalModule> {
    return ensureArchivePortalPromise();
}

export function loadLawsuitsWorkspaceModule(): Promise<LawsuitsWorkspaceModule> {
    return ensureLawsuitsWorkspacePromise();
}

const EXECUTION_CHUNK_SOFT_TIMEOUT_MS = 6_000;

function withSoftSettle(promise: Promise<unknown>): Promise<void> {
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        const timeoutId = window.setTimeout(finish, EXECUTION_CHUNK_SOFT_TIMEOUT_MS);
        promise.then(finish, finish).finally(() => window.clearTimeout(timeoutId));
    });
}

/**
 * سطح التنفيذ (lazy داخل ArchivePortal) — يُقيَّم أثناء InstantShell قبل التركيب.
 */
function ensureExecutionSurfacePromise(): Promise<void> {
    if (!executionSurfacePromise) {
        executionSurfacePromise = withSoftSettle(
            import('@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface').then((m) => {
                cachedExecutionSurface = m.ArchivePortalExecutionSurface;
            }),
        ).then(() => {
            executionSurfaceReady = true;
            notifyExecutionSurfaceListeners();
        });
    }
    return executionSurfacePromise;
}

/**
 * شبكة بطاقات التنفيذ — تقييم قبل اعتماد Portal لتفادي Suspense الداخلي.
 */
function ensureExecutionFileGridPromise(): Promise<void> {
    if (!executionFileGridPromise) {
        executionFileGridPromise = withSoftSettle(
            import(
                '@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid'
            ).then((m) => {
                cachedExecutionFileGrid = m.ExecutionArchiveFileGrid;
            }),
        ).then(() => {
            executionFileGridReady = true;
            notifyExecutionFileGridListeners();
        });
    }
    return executionFileGridPromise;
}

/** دعاوى — أرشيف + مستعجل (يُحمَّل عند التبويب) */
export function loadLawsuitArchiveHubModule(): Promise<ArchivePortalModule> {
    prefetchLawsuitArchiveContent();
    return loadArchivePortalModule();
}

/** تنفيذ — Portal فوراً؛ Surface/FileGrid تُسخَّن بالخلفية بلا حجب أول paint */
export function loadExecutionArchiveHubModule(): Promise<ArchivePortalModule> {
    prefetchExecutionArchiveContent();
    return loadArchivePortalModule();
}

/** شبكة بطاقات الدعاوى — تقييم أثناء InstantShell قبل تركيب Portal children */
export function prefetchLawsuitArchiveContent(): void {
    if (typeof window === 'undefined') return;
    void ensureLawsuitFileGridPromise();
}

/** سطح + شبكة مخزن التنفيذ — يمنع انتظار Suspense الداخلي بعد اعتماد Portal */
export function prefetchExecutionArchiveContent(): void {
    if (typeof window === 'undefined') return;
    void ensureExecutionSurfacePromise();
    void ensureExecutionFileGridPromise();
}

export function prefetchLawsuitArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadLawsuitArchiveHubModule().catch(() => undefined);
}

export function prefetchExecutionArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadExecutionArchiveHubModule().catch(() => undefined);
}

export function hydrateArchiveHubForInstantOpen(archiveId: 'execution' | 'lawsuit'): Promise<boolean> {
    if (archiveId === 'lawsuit') {
        prefetchLawsuitArchiveContent();
    } else {
        prefetchExecutionArchiveContent();
    }
    const loader =
        archiveId === 'lawsuit' ? loadLawsuitArchiveHubModule() : loadExecutionArchiveHubModule();
    return loader.then(() => true).catch(() => false);
}
